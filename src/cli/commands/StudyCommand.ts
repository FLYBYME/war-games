import * as fs from 'fs';
import * as path from 'path';
import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient, Side, ViewStatePayload, SimulationEvent, ViewUnitPayload } from '../../sdk/index.js';
import { C } from '../core/Utils.js';
import { scenarios } from '../../data/scenarios.js';

interface StudyOptions {
    outputDir?: string;
    port: string;
}

/**
 * StudyCommand: Automated batch execution and data recording.
 */
export class StudyCommand extends BaseCommand {
    public name = 'study';
    public description = 'Runs a scenario to completion and records telemetry for analysis.';

    register(program: CommanderCommand): void {
        program.command(this.name)
            .description(this.description)
            .argument('[scenarioId]', 'Scenario ID to run', 'salvo-aggregation')
            .option('-o, --output-dir <path>', 'Directory to save study results')
            .option('-p, --port <n>', 'Server port', '3000')
            .action((scenarioId: string, options: StudyOptions) => {
                void this.execute({ scenarioId, ...options }, program.opts() as { url: string });
            });
    }

    protected async execute(options: StudyOptions & { scenarioId: string }, _globalOpts: { url: string }): Promise<void> {
        const { scenarioId, port } = options;
        const selectedScenario = scenarios.find(s => s.id === scenarioId);

        if (!selectedScenario) {
            console.error(`${C.red}Scenario not found: ${scenarioId}${C.reset}`);
            process.exit(1);
        }

        console.log(`\n${C.magenta}${C.bold}📊 SCIENTIFIC STUDY: ${selectedScenario.name}${C.reset}`);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const studyDir = options.outputDir || `./studies/${selectedScenario.id}_${timestamp}`;
        fs.mkdirSync(studyDir, { recursive: true });

        const eventFile = path.join(studyDir, 'events.jsonl');
        const trajFile = path.join(studyDir, 'trajectories.jsonl');
        const summaryFile = path.join(studyDir, 'summary.txt');

        const eventStream = fs.createWriteStream(eventFile);
        const trajStream = fs.createWriteStream(trajFile);

        const client = new WarGamesClient({ url: `ws://localhost:${port}` });
        await client.connect();

        const matchId = `study-${timestamp}`;
        await client.joinMatch(Side.Neutral, matchId);
        await client.scenario.importScenario(selectedScenario);
        client.setTimeCompression(100);

        let lastVs: ViewStatePayload | null = null;
        let tickCount = 0;

        console.log(`${C.dim}Recording telemetry to ${studyDir}...${C.reset}`);

        const eventCounts = new Map<string, number>();
        const onViewState = (vs: ViewStatePayload) => {
            lastVs = vs;
            tickCount = vs.tick;

            // Record trajectories
            vs.units.forEach(u => {
                trajStream.write(JSON.stringify({ tick: vs.tick, id: u.id, side: u.side, pos: u.pos, hp: u.hp }) + '\n');
            });
        };

        const onEvent = (evt: SimulationEvent) => {
            eventStream.write(JSON.stringify(evt) + '\n');
            const count = eventCounts.get(evt.type) || 0;
            eventCounts.set(evt.type, count + 1);
        };

        client.events.on('state:viewState', onViewState);
        client.events.on('events:new', onEvent);
        client.events.on('error', (err) => {
            console.error(`${C.red}SDK Error: ${JSON.stringify(err)}${C.reset}`);
        });

        console.log(`${C.dim}Waiting for first viewstate...${C.reset}`);

        // Run until end condition (e.g. no more units on one side, or max ticks)
        const MaxTicks = 10000; // Increased for longer studies
        return new Promise((resolve) => {
            const check = setInterval(async () => {
                if (tickCount >= MaxTicks || (lastVs && this.isScenarioOver(lastVs))) {
                    console.log(`\n${C.green}Exit condition met: tickCount=${tickCount}${C.reset}`);
                    clearInterval(check);

                    // Stop listening to events before closing streams
                    client.events.off('state:viewState', onViewState);
                    client.events.off('events:new', onEvent);

                    eventStream.end();
                    trajStream.end();

                    // Generate Rich Summary
                    let s = `================================================================================\n`;
                    s += `📊 SCIENTIFIC STUDY REPORT: ${selectedScenario.name}\n`;
                    s += `Generated: ${new Date().toLocaleString()}\n`;
                    s += `Directory: ${studyDir}\n`;
                    s += `================================================================================\n\n`;
                    
                    s += `## SIMULATION METRICS\n`;
                    s += `Total Duration:    ${tickCount} ticks\n`;
                    s += `Realtime Duration: ${(tickCount / 10).toFixed(1)}s (at 10Hz)\n`;
                    s += `Final Losses (Blue): ${lastVs?.losses.blue || 0}\n`;
                    s += `Final Losses (Red):  ${lastVs?.losses.red || 0}\n`;
                    s += `Munitions Expended:  ${lastVs?.losses.munitionsExpended || 0}\n\n`;

                    s += `## EVENT ANALYSIS\n`;
                    if (eventCounts.size === 0) {
                        s += `No significant events recorded.\n`;
                    } else {
                        Array.from(eventCounts.entries()).sort((a,b) => b[1] - a[1]).forEach(([type, count]) => {
                            s += `- ${type.padEnd(20)}: ${count}\n`;
                        });
                    }
                    s += `\n`;

                    s += `## FINAL FORCE DISPOSITION\n`;
                    s += `ID`.padEnd(30) + `SIDE`.padEnd(10) + `STATUS`.padEnd(15) + `HP`.padEnd(10) + `FUEL%\n`;
                    s += `-`.repeat(80) + `\n`;

                    if (lastVs) {
                        const sortedUnits = [...lastVs.units].sort((a, b) => a.side.localeCompare(b.side));
                        sortedUnits.forEach(u => {
                            if (u.category === 'Weapon') return; // Skip in-flight munitions
                            const status = u.isDestroyed ? 'DESTROYED' : 'OPERATIONAL';
                            const fuelStr = (u.fuelPct * 100).toFixed(1) + '%';
                            s += `${u.id.slice(0, 29).padEnd(30)}${u.side.padEnd(10)}${status.padEnd(15)}${u.hp.toString().padEnd(10)}${fuelStr}\n`;
                        });
                    }
                    
                    s += `\n================================================================================\n`;
                    s += `END OF REPORT\n`;

                    fs.writeFileSync(summaryFile, s);

                    console.log(`\n${C.green}✔ Study Finished.${C.reset}`);
                    console.log(`${C.dim}Summary written to ${summaryFile}${C.reset}`);

                    // Clean up server-side match
                    await client.deleteMatch(matchId);

                    client.disconnect();
                    resolve();
                    process.exit(0);
                }
            }, 1000);
        });
    }

    private isScenarioOver(vs: ViewStatePayload): boolean {
        const isCombatant = (u: ViewUnitPayload) => {
            const pid = (u.profileId || '').toLowerCase();
            return !pid.includes('missile') && !pid.includes('projectile') && !pid.includes('torpedo') && !pid.includes('sonobuoy');
        };

        const blue = vs.units.filter(u => u.side === Side.Blue && !u.isDestroyed && isCombatant(u)).length;
        const red = vs.units.filter(u => u.side === Side.Red && !u.isDestroyed && isCombatant(u)).length;

        return blue === 0 || red === 0;
    }
}

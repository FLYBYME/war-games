import * as fs from 'fs';
import * as path from 'path';
import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient, Side, ViewStatePayload, SimulationEvent } from '../../sdk/index.js';
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

        await client.joinMatch(Side.Neutral, `study-${timestamp}`);
        await client.scenario.importScenario(selectedScenario);
        await client.scenario.setTimeCompression(100);

        let lastVs: ViewStatePayload | null = null;
        let tickCount = 0;

        console.log(`${C.dim}Recording telemetry to ${studyDir}...${C.reset}`);

        client.events.on('state:viewState', (vs: ViewStatePayload) => {
            lastVs = vs;
            tickCount = vs.tick;
            
            // Record trajectories
            vs.units.forEach(u => {
                trajStream.write(JSON.stringify({ tick: vs.tick, id: u.id, side: u.side, pos: u.pos, hp: u.hp }) + '\n');
            });
        });

        client.events.on('events:new', (evt: SimulationEvent) => {
            eventStream.write(JSON.stringify(evt) + '\n');
        });

        // Run until end condition (e.g. no more units on one side, or max ticks)
        const MaxTicks = 10000;
        return new Promise((resolve) => {
            const check = setInterval(async () => {
                if (tickCount >= MaxTicks || (lastVs && this.isScenarioOver(lastVs))) {
                    clearInterval(check);
                    
                    eventStream.end();
                    trajStream.end();

                    const summary = `Study Complete: ${selectedScenario.name}\nDuration: ${tickCount} ticks\nLosses: ${JSON.stringify(lastVs?.losses)}\n`;
                    fs.writeFileSync(summaryFile, summary);
                    
                    console.log(`\n${C.green}✔ Study Finished.${C.reset}`);
                    console.log(summary);
                    
                    client.disconnect();
                    resolve();
                    process.exit(0);
                }
            }, 1000);
        });
    }

    private isScenarioOver(vs: ViewStatePayload): boolean {
        const blue = vs.units.filter(u => u.side === Side.Blue && !u.isDestroyed).length;
        const red = vs.units.filter(u => u.side === Side.Red && !u.isDestroyed).length;
        return blue === 0 || red === 0;
    }
}

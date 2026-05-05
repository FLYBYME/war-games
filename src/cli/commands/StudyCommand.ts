import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { startServer } from '../../server/index.js';
import { WarGamesClient, Formatters, DeltaDecoder, Side, ScenarioManifest, EngineEvent, ScenarioAssertion } from '../../sdk/index.js';
import { logger } from '../../server/core/Logger.js';
import * as data from '../../data/index.js';
import { C } from '../core/Utils.js';

export class StudyCommand extends BaseCommand {
    public readonly name = 'study';
    public readonly description = 'Run an automated tactical study for a scenario';
    public readonly category = 'Research';
    public readonly aliases = ['demo', 'run-scenario'];

    public register(program: CommanderCommand): void {
        program
            .command(this.name)
            .description(this.description)
            .alias(this.aliases[0])
            .option('-s, --scenario <id|name|index>', 'Scenario to run', 'salvo-aggregation')
            .option('-l, --log-level <level>', 'Logging level (debug, info, warn, error)', 'info')
            .option('-t, --time-limit <ms>', 'Wall clock time limit in milliseconds', '60000')
            .option('-o, --output-dir <path>', 'Directory to save study results')
            .option('--tick-limit <count>', 'Maximum simulation ticks to run', '5000')
            .action((options) => this.execute(options));
    }

    protected async execute(options: any): Promise<void> {
        const scenarioArg = options.scenario;
        const scenarioList = data.scenarios;
        const logLevel = options.logLevel as any;
        const timeLimit = parseInt(options.timeLimit, 10);
        const tickLimit = parseInt(options.tickLimit, 10);

        logger.setLevel(logLevel);

        let selectedScenario: ScenarioManifest | null = null;
        if (!isNaN(parseInt(scenarioArg)) && scenarioList[parseInt(scenarioArg)]) {
            selectedScenario = scenarioList[parseInt(scenarioArg)];
        } else {
            selectedScenario = scenarioList.find(s => 
                (s.id && s.id.toLowerCase() === scenarioArg.toLowerCase()) || 
                s.name.toLowerCase().includes(scenarioArg.toLowerCase())
            ) || null;
        }

        if (!selectedScenario) {
            console.error(`${C.red}${C.bold}✖ Error:${C.reset} Scenario "${scenarioArg}" not found.`);
            console.log(`\nAvailable Scenarios:`);
            scenarioList.forEach((s, i) => console.log(`  [${i}] ${C.cyan}${s.id?.padEnd(20)}${C.reset} | ${s.name}`));
            return;
        }

        console.log(`\n${C.magenta}${C.bold}🚀 STUDY INITIATED:${C.reset} ${selectedScenario.name} (${selectedScenario.id})`);

        const server = await startServer(0);
        const port = server.port;

        // Bootstrap Profiles
        const bootstrapClient = new WarGamesClient({ url: `ws://localhost:${port}` });
        await bootstrapClient.connect();
        for (const [id, profile] of Object.entries(data.profiles)) {
            await bootstrapClient.scenario.saveProfile(id, profile);
        }
        await bootstrapClient.disconnect();

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
        DeltaDecoder.clear();

        await client.joinMatch(Side.Neutral, `study-${timestamp}`);
        await client.scenario.importScenario(selectedScenario);
        await client.scenario.setTimeCompression(100);

        let lastVs: any = null;
        let targetDestroyed = false;
        let maxRss = 0;
        const start = Date.now();
        let lastMetricsTime = start;

        // Real-time stats
        const stats = {
            weaponFires: 0,
            impacts: 0,
            destructions: 0,
            terrainHits: 0
        };

        const eventHandler = (evt: { type: string; payload: any }) => {
            const tick = client.getTickCount();
            const type = evt.type.replace('event:', '');

            if (evt.type !== 'state:viewState') {
                if (!eventStream.writableEnded) {
                    eventStream.write(JSON.stringify({ tick, type, data: evt.payload }) + '\n');
                }
            }

            if (evt.type === 'state:viewState') {
                lastVs = evt.payload;
                if (!trajStream.writableEnded) {
                    lastVs.units.forEach((u: any) => {
                        trajStream.write(JSON.stringify({
                            tick, id: u.id, isTrack: false, name: u.profileId,
                            pos: u.pos, lla: u.lla, hp: u.hp
                        }) + '\n');
                    });
                    lastVs.tracks.forEach((t: any) => {
                        trajStream.write(JSON.stringify({
                            tick, id: t.id, isTrack: true, name: t.classification,
                            pos: t.pos, lla: t.lla
                        }) + '\n');
                    });
                }
            }

            if (type === 'WeaponFired') stats.weaponFires++;
            if (type === 'Impact') {
                if (evt.payload.data?.targetId === 'TERRAIN') stats.terrainHits++;
                else {
                    stats.impacts++;
                    targetDestroyed = true; // For demo purposes, stop on first tactical impact
                }
            }
            if (type === 'EntityDestroyed') {
                stats.destructions++;
                targetDestroyed = true;
            }
        };

        client.events.onAny(eventHandler);

        // Simulation Loop
        while (client.getTickCount() < tickLimit && !targetDestroyed) {
            const now = Date.now();
            if (now - start > timeLimit) {
                console.log(`\n${C.yellow}⚠ Wall clock time limit reached.${C.reset}`);
                break;
            }

            // Periodic System Metrics (Every 10s)
            if (now - lastMetricsTime >= 10000) {
                const rss = process.memoryUsage().rss;
                maxRss = Math.max(maxRss, rss);
                const wallElapsed = (now - start) / 1000;
                const speed = (client.getTickCount() / 10) / wallElapsed;
                console.log(`${C.dim}[System] Tick: ${String(client.getTickCount()).padStart(6)} | Speed: ${speed.toFixed(1)}x | Mem: ${Math.round(rss / 1024 / 1024)}MB | Shots: ${stats.weaponFires}${C.reset}`);
                lastMetricsTime = now;
                
                if (rss > 1024 * 1024 * 1024) {
                    console.warn(`${C.red}${C.bold}⚠ HIGH MEMORY USAGE DETECTED: ${Math.round(rss / 1024 / 1024)}MB${C.reset}`);
                }
            }

            await new Promise(r => setTimeout(r, 100));
        }

        const end = Date.now();
        client.events.offAny(eventHandler);
        await client.disconnect();
        eventStream.end();
        trajStream.end();

        await Promise.all([
            new Promise<void>(r => eventStream.on('finish', () => r())),
            new Promise<void>(r => trajStream.on('finish', () => r()))
        ]);

        // ─── Generate Report (Optimized Memory) ──────────────────────────────────
        await this.generateReport(selectedScenario, trajFile, eventFile, summaryFile, studyDir, stats, maxRss, start, end, client.getTickCount());

        await server.stop();
        console.log(`\n${C.green}${C.bold}✔ STUDY COMPLETE${C.reset} | Results: ${C.cyan}${studyDir}${C.reset}\n`);
    }

    private async generateReport(scenario: ScenarioManifest, trajFile: string, eventFile: string, summaryFile: string, studyDir: string, stats: any, maxRss: number, start: number, end: number, finalTick: number) {
        const log = (msg: string, colorMsg: string = msg) => {
            console.log(colorMsg);
            fs.appendFileSync(summaryFile, msg.replace(/\x1b\[[0-9;]*m/g, "") + '\n');
        };

        log(`\nSTUDY REPORT: ${scenario.name}`);
        log(`ID: ${scenario.id}`);
        log(`Generated: ${new Date().toLocaleString()}`);
        log(`──────────────────────────────────────────────────`);

        log(`\nSUMMARY STATS:`);
        log(` Weapons Fired:   ${stats.weaponFires}`);
        log(` Tactical Impacts: ${stats.impacts}`);
        log(` Terrain Impacts:  ${stats.terrainHits}`);
        log(` Entities Lost:    ${stats.destructions}`);

        // --- Memory-Optimized Trajectory Processing ---
        log(`\nENTITY ANALYSIS:`);
        log(`──────────────────────────────────────────────────`);

        const entityMeta = new Map<string, { count: number, name: string, isTrack: boolean, first?: any, last?: any }>();
        const terminalTruths: any[] = [];

        // Pass 1: Scan for metadata and terminal truths
        const trajReader1 = readline.createInterface({ input: fs.createReadStream(trajFile), crlfDelay: Infinity });
        for await (const line of trajReader1) {
            if (!line) continue;
            const p = JSON.parse(line);
            if (!entityMeta.has(p.id)) {
                entityMeta.set(p.id, { count: 0, name: p.name, isTrack: p.isTrack, first: p });
            }
            const meta = entityMeta.get(p.id)!;
            meta.count++;
            meta.last = p;
            if (p.name === 'Terminal') terminalTruths.push(p);
        }

        // Pass 2: Print Stats and Samples
        for (const [id, meta] of entityMeta.entries()) {
            if (meta.name === 'Terminal') continue;

            let distKm = "0.00";
            let avgSpeed = 0;
            if (meta.first?.lla && meta.last?.lla) {
                const dLat = (meta.last.lla.lat - meta.first.lla.lat) * 111.319;
                const dLon = (meta.last.lla.lon - meta.first.lla.lon) * (111.319 * Math.cos(meta.first.lla.lat * Math.PI / 180));
                const rangeKm = Math.sqrt(dLat * dLat + dLon * dLon);
                distKm = rangeKm.toFixed(2);
                const totalTime = (meta.last.tick - meta.first.tick) / 10;
                avgSpeed = totalTime > 0 ? (rangeKm * 1000 / totalTime) * 1.94384 : 0;
            }

            log(`\n${meta.isTrack ? "Track" : "Entity"} ${id} [${meta.name}]:`);
            log(`  Samples: ${meta.count} | Distance: ${distKm} km | Avg Speed: ${avgSpeed.toFixed(1)} kts`);

            // Pick 10 samples (Pass 2.1)
            const stride = Math.max(1, Math.floor(meta.count / 10));
            let currentIdx = 0;
            const trajReader2 = readline.createInterface({ input: fs.createReadStream(trajFile), crlfDelay: Infinity });
            for await (const line of trajReader2) {
                if (!line) continue;
                const p = JSON.parse(line);
                if (p.id !== id) continue;
                if (currentIdx % stride === 0 || currentIdx === meta.count - 1) {
                    const progress = Math.round(((p.tick - meta.first.tick) / Math.max(1, meta.last.tick - meta.first.tick)) * 100);
                    const alt = Math.max(0, p.lla?.alt || p.pos?.z || 0).toFixed(0);
                    log(`  ${progress.toString().padStart(3)}% | Tick ${String(p.tick).padStart(4)} | Lat: ${p.lla?.lat.toFixed(4)}, Lon: ${p.lla?.lon.toFixed(4)} | Alt: ${alt.padStart(5)}m`);
                }
                currentIdx++;
            }
        }

        log(`\nSIMULATION PERFORMANCE:`);
        log(`──────────────────────────────────────────────────`);
        log(` Sim Duration:  ${(finalTick / 10).toFixed(1)}s (${finalTick} ticks)`);
        log(` Wall Clock:    ${((end - start) / 1000).toFixed(2)}s`);
        log(` Max RSS Used:  ${Math.round(maxRss / 1024 / 1024)}MB`);
    }
}

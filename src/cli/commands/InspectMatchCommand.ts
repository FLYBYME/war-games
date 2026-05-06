import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import {
    WarGamesClient,
    ViewStatePayload as ViewState,
    ViewUnitPayload as ViewUnit,
    ViewTrackPayload as ViewTrack,
    EngineEvent,
    Side
} from '../../sdk/index.js';
import { C } from '../core/Utils.js';
import WebSocket from 'ws';

// Shim WebSocket for Node environment if needed by SDK
if (typeof (global as any).WebSocket === 'undefined') {
    (global as any).WebSocket = WebSocket;
}

interface CapturedEvent {
    tick: number;
    type: string;
    data: any;
}

interface CommandOptions {
    watch?: boolean;
    unit?: string;
    side: string;
    url: string;
    showTracks?: boolean;
    showEvents?: boolean;
    limit: number;
    samples: number;
}

export class InspectMatchCommand extends BaseCommand {
    public readonly name = 'inspect-match';
    public readonly description = 'Query the current world state of a match';
    public readonly category = 'Tactical';

    private capturedEvents: CapturedEvent[] = [];

    public register(program: CommanderCommand): void {
        program
            .command(this.name)
            .description(this.description)
            .argument('[matchId]', 'ID of the match to inspect', 'default')
            .option('-w, --watch', 'Continuously monitor the match state')
            .option('-u, --unit <id>', 'Filter and show details for a specific unit ONLY')
            .option('-s, --side <side>', 'Side to join as (Blue, Red, Neutral)', 'Neutral')
            .option('--show-tracks', 'Show active sensor tracks')
            .option('--show-events', 'Capture and show tactical events')
            .option('--limit <number>', 'Limit the number of sample units/tracks shown', (val) => parseInt(val, 10), 5)
            .option('--samples <number>', 'Number of historical movement samples to show', (val) => parseInt(val, 10), 0)
            .action((matchId: string, options: Partial<CommandOptions>, command: CommanderCommand) => {
                const globalOpts = command.optsWithGlobals();
                this.execute(matchId || 'default', {
                    side: 'Neutral',
                    limit: 5,
                    samples: 0,
                    ...options,
                    url: globalOpts.url
                } as CommandOptions);
            });
    }

    protected async execute(matchId: string, options: CommandOptions): Promise<void> {
        console.log(`${C.dim}Connecting to server ${C.cyan}${options.url}${C.dim}...${C.reset}`);

        const client = new WarGamesClient({
            url: options.url,
            connectTimeoutMs: 2000
        });

        try {
            await client.connect();
            console.log(`${C.green}Connected.${C.reset} Joining match ${C.cyan}${matchId}${C.reset} as ${C.yellow}${options.side}${C.reset}...`);

            client.joinMatch(options.side, matchId);

            let telemetry: Record<string, any[]> | null = null;
            if (options.samples > 0) {
                console.log(`${C.dim}Fetching telemetry history...${C.reset}`);
                try {
                    telemetry = await client.scenario.getTelemetry(matchId);
                } catch (err) {
                    console.warn(`${C.yellow}Warning: Failed to fetch telemetry: ${err}${C.reset}`);
                }
            }

            if (options.showEvents) {
                client.events.onAny((evt: { type: string, payload: any }) => {
                    if (evt.type?.startsWith('event:')) {
                        const engineEvt = evt.payload as EngineEvent;
                        this.capturedEvents.push({
                            tick: engineEvt.tick || client.getTickCount(),
                            type: evt.type.replace('event:', ''),
                            data: engineEvt.data
                        });
                        if (this.capturedEvents.length > 10) this.capturedEvents.shift();
                    }
                });
            }

            if (options.watch) {
                console.log(`${C.dim}Starting watch mode. Press Ctrl+C to exit.${C.reset}`);
                client.events.on('state:viewState', (vs: ViewState) => {
                    this.renderDashboard(matchId, vs, options, telemetry);
                });
                await new Promise(() => { });
            } else {
                console.log(`${C.dim}Waiting for tactical data...${C.reset}`);
                const snapshot = await new Promise<ViewState>((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timed out waiting for ViewState')), 5000);
                    client.events.once('state:viewState', (vs: ViewState) => {
                        clearTimeout(timeout);
                        resolve(vs);
                    });
                });
                this.renderStatic(matchId, snapshot, options, telemetry);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${message}`);
        } finally {
            client.disconnect();
            if (!options.watch) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    private renderDashboard(matchId: string, vs: ViewState, options: CommandOptions, telemetry: Record<string, any[]> | null): void {
        process.stdout.write('\x1Bc');
        this.renderStatic(matchId, vs, options, telemetry);
        console.log(`\n${C.dim}Last update: ${new Date().toLocaleTimeString()}${C.reset}`);
    }

    private renderStatic(matchId: string, snapshot: ViewState, options: CommandOptions, telemetry: Record<string, any[]> | null): void {
        const filterUnitId = options.unit;
        const limit = options.limit;
        const samples = options.samples;

        if (filterUnitId) {
            const unit = snapshot.units.find((u: ViewUnit) => u.id === filterUnitId);
            if (unit) {
                console.log(`\n${C.bold}--- Unit Detail: ${filterUnitId} [Match: ${matchId}] ---${C.reset}`);
                console.log(`Tick:      ${C.yellow}${snapshot.tick}${C.reset} ${snapshot.isPaused ? C.red + '[PAUSED]' : C.green + '[RUNNING]'}${C.reset}`);
                console.log(`Profile:   ${C.cyan}${unit.profileId || 'unknown'}${C.reset}`);
                console.log(`Side:      ${C.blue}${unit.side}${C.reset}`);
                console.log(`Position:  ${unit.pos?.x?.toFixed(4) || '0.0000'}, ${unit.pos?.y?.toFixed(4) || '0.0000'}`);
                console.log(`Alt/Depth: ${unit.pos?.z?.toFixed(0) || '0'}m`);

                console.log(`Heading:   ${unit.rot?.toFixed(1) || '0.0'}°`);
                if (unit.speedKts !== undefined) {
                    console.log(`Speed:     ${unit.speedKts.toFixed(1)} kts`);
                }

                if (unit.hp !== undefined) {
                    const healthColor = unit.hp > 50 ? C.green : (unit.hp > 20 ? C.yellow : C.red);
                    console.log(`Integrity: ${healthColor}${unit.hp.toFixed(0)}%${C.reset}`);
                }

                if (telemetry && telemetry[filterUnitId] && samples > 0) {
                    const history = telemetry[filterUnitId];
                    console.log(`\n${C.bold}--- Movement History (${Math.min(samples, history.length)} samples) ---${C.reset}`);
                    const stride = Math.max(1, Math.floor(history.length / samples));
                    let currentIdx = 0;
                    for (let i = 0; i < history.length; i++) {
                        if (currentIdx % stride === 0 || currentIdx === history.length - 1) {
                            const p = history[i];
                            const alt = Math.max(0, p.altM || 0).toFixed(0);
                            const spd = (p.speedKts || 0).toFixed(1);
                            console.log(`  Tick ${String(p.tick).padStart(4)} | Pos: ${p.pos.x.toFixed(2)}, ${p.pos.y.toFixed(2)} | Alt: ${alt.padStart(5)}m | Spd: ${spd} kts`);
                        }
                        currentIdx++;
                        if (currentIdx / stride >= samples) break;
                    }
                }
            } else {
                console.log(`\n${C.yellow}Unit ${filterUnitId} not found in current viewstate for match ${matchId}.${C.reset}`);
            }
            return;
        }
        console.log(`Tick:      ${C.yellow}${snapshot.tick}${C.reset} ${snapshot.isPaused ? C.red + '[PAUSED]' : C.green + '[RUNNING]'}${C.reset}`);
        console.log(`Sequence:  ${snapshot.sequence}`);
        console.log(`Units:     ${C.green}${snapshot.units.length}${C.reset}`);
        console.log(`Tracks:    ${C.magenta}${snapshot.tracks.length}${C.reset}`);

        console.log(`\n${C.bold}--- Details ---${C.reset}`);
        console.log(`MapData:   ${snapshot.mapData ? C.green + 'Present' : C.red + 'Missing'}${C.reset}`);
        console.log(`Datalink Edges:  ${snapshot.datalinkGraph?.edges?.length || 0}`);
        console.log(`ESM Bearings:    ${snapshot.esmBearings?.length || 0}`);
        console.log(`Weapon Bindings: ${snapshot.weaponBindings?.length || 0}`);

        if (snapshot.units.length > 0) {
            console.log(`\n${C.bold}--- Unit List (Showing ${Math.min(snapshot.units.length, limit)} of ${snapshot.units.length}) ---${C.reset}`);
            snapshot.units.slice(0, limit).forEach((u) => {
                const side = (u.side || '???').padEnd(5);
                const profileId = (u.profileId || 'unknown').padEnd(12);
                const id = (u.id || 'no-id').padEnd(10);
                const posX = u.pos?.x?.toFixed(2) || '0.00';
                const posY = u.pos?.y?.toFixed(2) || '0.00';
                console.log(` - [${C.blue}${side}${C.reset}] ${C.cyan}${profileId}${C.reset} (${id}) @ ${posX},${posY}`);
            });
        }

        if (options.showTracks && snapshot.tracks.length > 0) {
            console.log(`\n${C.bold}--- Sensor Tracks (Showing ${Math.min(snapshot.tracks.length, limit)} of ${snapshot.tracks.length}) ---${C.reset}`);
            snapshot.tracks.slice(0, limit).forEach((t) => {

                const id = (t.id || 'no-id').padEnd(10);
                const classification = (t.classification || 'Unknown').padEnd(12);
                const idStatus = (t.identification || 'Unknown').padEnd(12);
                const posX = t.pos?.x?.toFixed(2) || '0.00';
                const posY = t.pos?.y?.toFixed(2) || '0.00';
                console.log(` - [${C.magenta}${classification}${C.reset}] ${id} | ${C.yellow}${idStatus}${C.reset} @ ${posX},${posY}`);
            });
        }

        if (options.showEvents && this.capturedEvents.length > 0) {
            console.log(`\n${C.bold}--- Recent Events ---${C.reset}`);
            this.capturedEvents.forEach(evt => {
                console.log(` [${C.dim}T:${evt.tick}${C.reset}] ${C.yellow}${evt.type}${C.reset}`);
            });
        }
    }
}

import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient } from '../../sdk/WarGamesClient.js';
import { Side } from '../../engine/core/Types.js';
import { C } from '../core/Utils.js';
import WebSocket from 'ws';
import * as readline from 'readline';

// Shim WebSocket for Node environment if needed by SDK
if (typeof (global as any).WebSocket === 'undefined') {
    (global as any).WebSocket = WebSocket;
}

export class InspectMatchCommand extends BaseCommand {
    public readonly name = 'inspect-match';
    public readonly description = 'Query the current world state of a match';
    public readonly category = 'Tactical';

    public register(program: CommanderCommand): void {
        program
            .command(this.name)
            .description(this.description)
            .argument('[matchId]', 'ID of the match to inspect', 'default')
            .option('-w, --watch', 'Continuously monitor the match state')
            .option('-u, --unit <id>', 'Filter and show details for a specific unit')
            .option('-s, --side <side>', 'Side to join as (Blue, Red, Neutral)', 'Neutral')
            .action((matchId, options, command) => {
                const globalOpts = command.optsWithGlobals();
                this.execute(matchId, { ...options, url: globalOpts.url });
            });
    }

    protected async execute(matchId: string, options: { watch?: boolean, unit?: string, side: string, url: string }): Promise<void> {
        console.log(`${C.dim}Connecting to server ${C.cyan}${options.url}${C.dim}...${C.reset}`);
        
        const client = new WarGamesClient({
            url: options.url,
            connectTimeoutMs: 2000
        });

        try {
            await client.connect();
            console.log(`${C.green}Connected.${C.reset} Joining match ${C.cyan}${matchId}${C.reset} as ${C.yellow}${options.side}${C.reset}...`);
            
            client.joinMatch(options.side, matchId);

            if (options.watch) {
                console.log(`${C.dim}Starting watch mode. Press Ctrl+C to exit.${C.reset}`);
                
                client.events.on('state:viewState', (vs: any) => {
                    this.renderDashboard(matchId, vs, options.unit);
                });

                // Keep process alive
                await new Promise(() => {});
            } else {
                // Wait for the first ViewState
                console.log(`${C.dim}Waiting for tactical data...${C.reset}`);
                const snapshot = await new Promise<any>((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Timed out waiting for ViewState')), 5000);
                    client.events.once('state:viewState', (vs: any) => {
                        clearTimeout(timeout);
                        resolve(vs);
                    });
                });

                this.renderStatic(matchId, snapshot, options.unit);
            }

        } catch (err: any) {
            console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`);
            if (err.message.includes('ECONNREFUSED')) {
                console.error(`${C.yellow}Make sure the server is running (npm run cli start-server)${C.reset}`);
            }
        } finally {
            client.disconnect();
            if (!options.watch) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    private renderDashboard(matchId: string, vs: any, filterUnitId?: string): void {
        // Clear screen and move cursor to top-left
        process.stdout.write('\x1Bc'); 
        this.renderStatic(matchId, vs, filterUnitId);
        console.log(`\n${C.dim}Last update: ${new Date().toLocaleTimeString()}${C.reset}`);
    }

    private renderStatic(matchId: string, snapshot: any, filterUnitId?: string): void {
        console.log(`\n${C.bold}--- World State: ${matchId} ---${C.reset}`);
        console.log(`Tick:      ${C.yellow}${snapshot.tick}${C.reset} ${snapshot.isPaused ? C.red + '[PAUSED]' : C.green + '[RUNNING]'}${C.reset}`);
        console.log(`Sequence:  ${snapshot.sequence}`);
        console.log(`Units:     ${C.green}${snapshot.units.length}${C.reset}`);
        console.log(`Tracks:    ${C.magenta}${snapshot.tracks.length}${C.reset}`);
        
        if (filterUnitId) {
            const unit = snapshot.units.find((u: any) => u.id === filterUnitId);
            if (unit) {
                console.log(`\n${C.bold}--- Unit Detail: ${filterUnitId} ---${C.reset}`);
                console.log(`Profile:   ${C.cyan}${unit.profileId}${C.reset}`);
                console.log(`Side:      ${C.blue}${unit.side}${C.reset}`);
                console.log(`Position:  ${unit.pos.x.toFixed(4)}, ${unit.pos.y.toFixed(4)}`);
                console.log(`Alt/Depth: ${unit.pos.z.toFixed(0)}m`);
                if (unit.kinematics) {
                    console.log(`Heading:   ${unit.kinematics.heading.toFixed(1)}°`);
                    console.log(`Speed:     ${unit.kinematics.speed.toFixed(1)} kts`);
                }
                if (unit.health) {
                    const healthColor = unit.health.integrity > 50 ? C.green : (unit.health.integrity > 20 ? C.yellow : C.red);
                    console.log(`Integrity: ${healthColor}${unit.health.integrity}%${C.reset}`);
                }
            } else {
                console.log(`\n${C.yellow}Unit ${filterUnitId} not found in current viewstate.${C.reset}`);
            }
        } else {
            console.log(`\n${C.bold}--- Details ---${C.reset}`);
            console.log(`MapData:   ${snapshot.mapData ? C.green + 'Present' : C.red + 'Missing'}${C.reset}`);
            console.log(`Datalink Edges:  ${snapshot.datalinkGraph?.edges?.length || 0}`);
            console.log(`ESM Bearings:    ${snapshot.esmBearings?.length || 0}`);
            console.log(`Weapon Bindings: ${snapshot.weaponBindings?.length || 0}`);
            
            // Print sample units
            if (snapshot.units.length > 0) {
                console.log(`\n${C.bold}--- Sample Units ---${C.reset}`);
                snapshot.units.slice(0, 5).forEach((u: any) => {
                    const side = (u.side || '???').padEnd(5);
                    const profileId = (u.profileId || 'unknown').padEnd(12);
                    const id = (u.id || 'no-id').padEnd(10);
                    const posX = u.pos?.x?.toFixed(2) || '0.00';
                    const posY = u.pos?.y?.toFixed(2) || '0.00';
                    console.log(` - [${C.blue}${side}${C.reset}] ${C.cyan}${profileId}${C.reset} (${id}) @ ${posX},${posY}`);
                });
            }
        }
    }
}

import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient } from '../../sdk/WarGamesClient.js';
import { Side } from '../../engine/core/Types.js';
import { C } from '../core/Utils.js';
import WebSocket from 'ws';

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
            .action((matchId) => this.execute(matchId));
    }

    protected async execute(matchId: string): Promise<void> {
        console.log(`${C.dim}Connecting to server...${C.reset}`);
        
        const client = new WarGamesClient({
            url: 'ws://localhost:3000',
            connectTimeoutMs: 2000
        });

        try {
            await client.connect();
            console.log(`${C.green}Connected.${C.reset} Joining match ${C.cyan}${matchId}${C.reset}...`);
            
            client.joinMatch(Side.Blue, matchId);

            // Wait for the first ViewState
            console.log(`${C.dim}Waiting for tactical data...${C.reset}`);
            const snapshot = await new Promise<any>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timed out waiting for ViewState')), 5000);
                client.events.on('state:viewState', (vs: any) => {
                    clearTimeout(timeout);
                    resolve(vs);
                });
            });

            console.log(`\n${C.bold}--- World State (via SDK): ${matchId} ---${C.reset}`);
            console.log(`Tick:      ${C.yellow}${snapshot.tick}${C.reset}`);
            console.log(`Sequence:  ${snapshot.sequence}`);
            console.log(`Units:     ${C.green}${snapshot.units.length}${C.reset}`);
            console.log(`Tracks:    ${C.magenta}${snapshot.tracks.length}${C.reset}`);
            
            console.log(`\n${C.bold}--- Details ---${C.reset}`);
            console.log(`MapData:   ${snapshot.mapData ? C.green + 'Present' : C.red + 'Missing'}${C.reset}`);
            if (snapshot.mapData) {
                console.log(` - Borders:    ${snapshot.mapData.borders?.features?.length || 0} features`);
                console.log(` - Bathymetry: ${snapshot.mapData.bathymetry?.features?.length || 0} features`);
            }
            console.log(`Datalink Edges:  ${snapshot.datalinkGraph.edges.length}`);
            console.log(`ESM Bearings:    ${snapshot.esmBearings.length}`);
            console.log(`Weapon Bindings: ${snapshot.weaponBindings.length}`);
            
            // Print sample units
            if (snapshot.units.length > 0) {
                console.log(`\n${C.bold}--- Sample Units ---${C.reset}`);
                snapshot.units.slice(0, 3).forEach((u: any) => {
                    console.log(` - [${C.blue}${u.side}${C.reset}] ${C.cyan}${u.profileId}${C.reset} (${u.id}) @ ${Math.round(u.pos.x)},${Math.round(u.pos.y)}`);
                });
            }

        } catch (err: any) {
            console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`);
            if (err.message.includes('ECONNREFUSED')) {
                console.error(`${C.yellow}Make sure the server is running (npm run server)${C.reset}`);
            }
        } finally {
            client.disconnect();
            // Give some time for WS to close gracefully
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

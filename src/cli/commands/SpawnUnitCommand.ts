import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient } from '../../sdk/WarGamesClient.js';
import { C } from '../core/Utils.js';

export class SpawnUnitCommand extends BaseCommand {
    public readonly name = 'spawn-unit';
    public readonly description = 'Spawn a new unit into the simulation';
    public readonly category = 'Tactical';

    public register(program: CommanderCommand): void {
        program
            .command(this.name)
            .description(this.description)
            .argument('<id>', 'Unique ID for the unit')
            .argument('<profile>', 'Profile ID (e.g., f-16, carrier)')
            .argument('<side>', 'Side (Blue, Red, Neutral)')
            .argument('<lat>', 'Latitude', (val) => parseFloat(val))
            .argument('<lon>', 'Longitude', (val) => parseFloat(val))
            .option('-h, --heading <number>', 'Initial heading in degrees', (val) => parseFloat(val), 0)
            .option('--url <url>', 'Server URL', 'ws://localhost:3000')
            .action((id, profile, side, lat, lon, options) => this.execute(id, profile, side, lat, lon, options.heading, options.url));
    }

    protected async execute(id: string, profile: string, side: string, lat: number, lon: number, heading: number, url: string): Promise<void> {
        const client = new WarGamesClient({
            url: url,
            connectTimeoutMs: 2000
        });

        try {
            await client.connect();
            console.log(`${C.dim}Spawning ${C.cyan}${profile}${C.reset} as ${C.yellow}${id}${C.reset} at ${lat},${lon}...`);
            
            client.joinMatch('Neutral', 'default'); // We need to be joined to dispatch commands

            const result = await client.scenario.spawnEntity(
                id,
                profile,
                side,
                { x: lon, y: lat, z: 0 },
                heading
            );

            if (result.success) {
                console.log(`${C.green}${C.bold}✔ Unit spawned successfully.${C.reset}`);
            } else {
                console.error(`${C.red}${C.bold}✖ Failed to spawn unit.${C.reset}`);
            }
        } catch (err: any) {
            console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`);
        } finally {
            client.disconnect();
        }
    }
}

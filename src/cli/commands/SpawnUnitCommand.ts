import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient, Side } from '../../sdk/index.js';
import { C } from '../core/Utils.js';

interface SpawnOptions {
    side: string;
    pos: string;
    heading: string;
}

/**
 * SpawnUnitCommand: Inject a new entity into a running match.
 */
export class SpawnUnitCommand extends BaseCommand {
    public name = 'spawn-unit';
    public description = 'Spawns a new unit into an active match.';

    register(program: CommanderCommand): void {
        program.command(this.name)
            .description(this.description)
            .argument('<matchId>', 'The match ID to inject into')
            .argument('<profileId>', 'Unit profile ID (e.g. f-35a)')
            .option('-s, --side <side>', 'Side (Blue, Red, Neutral)', 'Neutral')
            .option('-p, --pos <x,y,z>', 'Position in meters', '0,0,0')
            .option('-h, --heading <deg>', 'Initial heading', '0')
            .action((matchId: string, profileId: string, options: SpawnOptions) => {
                void this.execute({ matchId, profileId, ...options }, program.opts() as { url: string });
            });
    }

    protected async execute(options: SpawnOptions & { matchId: string, profileId: string }, globalOpts: { url: string }): Promise<void> {
        const { matchId, profileId, side, pos, heading } = options;
        const client = new WarGamesClient({ url: globalOpts.url });

        console.log(`\n${C.magenta}${C.bold}🚀 UNIT INJECTION${C.reset}`);

        try {
            const coords = pos.split(',').map(Number);
            const position = { x: coords[0] || 0, y: coords[1] || 0, z: coords[2] || 0 };

            await client.connect();
            client.joinMatch(Side.Neutral, matchId); // We need to be joined to dispatch commands

            const res = await client.scenario.spawnEntity(
                `${profileId}-${Date.now()}`,
                profileId,
                side as Side,
                position,
                parseFloat(heading)
            );

            if (res.success) {
                console.log(`${C.green}✔ Unit ${C.bold}${profileId}${C.reset} spawned successfully at ${pos}.`);
            } else {
                console.error(`${C.red}✖ Injection failed.${C.reset}`);
            }

        } catch (err: unknown) {
            const error = err as Error;
            console.error(`\n${C.red}${C.bold}Spawn Failed:${C.reset} ${error.message}`);
        } finally {
            await new Promise(r => setTimeout(() => r(undefined), 100));
            client.disconnect();
            process.exit(0);
        }
    }
}

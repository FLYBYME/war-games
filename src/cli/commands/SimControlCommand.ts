import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient, Side } from '../../sdk/index.js';
import { C } from '../core/Utils.js';

interface ControlOptions {
    pause: boolean;
    resume: boolean;
    rate: string;
    delete: boolean;
}

/**
 * SimControlCommand: Direct manipulation of match parameters.
 */
export class SimControlCommand extends BaseCommand {
    public name = 'control';
    public description = 'Send immediate control commands (pause, resume, rate) to a match.';

    register(program: CommanderCommand): void {
        program.command(this.name)
            .description(this.description)
            .argument('<matchId>', 'The match ID to control')
            .option('--pause', 'Pause simulation')
            .option('--resume', 'Resume simulation')
            .option('--rate <n>', 'Set time compression (0-30)')
            .option('--delete', 'Terminates and deletes the match')
            .action((matchId: string, options: ControlOptions) => {
                void this.execute({ matchId, ...options }, program.opts() as { url: string });
            });
    }

    protected async execute(options: ControlOptions & { matchId: string }, globalOpts: { url: string }): Promise<void> {
        const { matchId } = options;
        const client = new WarGamesClient({ url: globalOpts.url });

        console.log(`\n${C.magenta}${C.bold}🕹  SIMULATION CONTROL${C.reset}`);

        try {
            await client.connect();
            client.joinMatch(Side.Neutral, matchId);

            if (options.delete) {
                console.log(`${C.red}Deleting match ${matchId}...${C.reset}`);
                const res = await client.deleteMatch(matchId);
                if (res.success) console.log(`${C.green}✔ Match deleted.${C.reset}`);
                else console.error(`${C.red}✖ Failed to delete match.${C.reset}`);
                return;
            }

            if (options.pause) {
                console.log(`${C.yellow}Pausing simulation...${C.reset}`);
                client.pause();
            } else if (options.resume) {
                console.log(`${C.green}Resuming simulation...${C.reset}`);
                client.resume(1);
            }

            if (options.rate !== undefined) {
                const rate = parseInt(options.rate);
                console.log(`${C.cyan}Setting time compression to ${rate}x...${C.reset}`);
                client.setTimeCompression(rate);
            }

            console.log(`${C.green}✔ Control commands dispatched.${C.reset}`);

        } catch (err: unknown) {
            const error = err as Error;
            console.error(`\n${C.red}${C.bold}Control Failed:${C.reset} ${error.message}`);
        } finally {
            // Give a tiny bit of time for messages to send before closing
            await new Promise(r => setTimeout(() => r(undefined), 100));
            client.disconnect();
            process.exit(0);
        }
    }
}

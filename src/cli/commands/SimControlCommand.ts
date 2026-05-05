import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient } from '../../sdk/WarGamesClient.js';
import { C } from '../core/Utils.js';

export class SimControlCommand extends BaseCommand {
    public readonly name = 'sim';
    public readonly description = 'Control the simulation clock (pause, resume, speed)';
    public readonly category = 'Infrastructure';

    public register(program: CommanderCommand): void {
        const sim = program
            .command(this.name)
            .description(this.description);

        sim.command('pause')
            .description('Pause the simulation')
            .action((options, command) => {
                const globalOpts = command.optsWithGlobals();
                this.execute('pause', undefined, globalOpts.url);
            });

        sim.command('resume')
            .description('Resume the simulation')
            .option('-r, --rate <number>', 'Time compression rate', (val) => parseFloat(val), 1)
            .action((options, command) => {
                const globalOpts = command.optsWithGlobals();
                this.execute('resume', options.rate, globalOpts.url);
            });

        sim.command('speed')
            .description('Set time compression rate')
            .argument('<rate>', 'Rate (e.g., 1 for real-time, 10 for 10x)', (val) => parseFloat(val))
            .action((rate, options, command) => {
                const globalOpts = command.optsWithGlobals();
                this.execute('speed', rate, globalOpts.url);
            });
    }

    protected async execute(action: string, rate?: number, url: string = 'ws://localhost:3000'): Promise<void> {
        const client = new WarGamesClient({
            url: url,
            connectTimeoutMs: 2000
        });

        try {
            await client.connect();
            client.joinMatch('Neutral', 'default');

            switch (action) {
                case 'pause':
                    console.log(`${C.yellow}Pausing simulation...${C.reset}`);
                    client.pause();
                    break;
                case 'resume':
                    console.log(`${C.green}Resuming simulation at ${rate}x speed...${C.reset}`);
                    client.resume(rate);
                    break;
                case 'speed':
                    console.log(`${C.blue}Setting simulation speed to ${rate}x...${C.reset}`);
                    client.setTimeCompression(rate!);
                    break;
            }

            console.log(`${C.green}${C.bold}✔ Command sent.${C.reset}`);
        } catch (err: any) {
            console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`);
        } finally {
            client.disconnect();
        }
    }
}

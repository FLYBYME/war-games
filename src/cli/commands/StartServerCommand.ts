import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { startServer } from '../../server/index.js';
import { C } from '../core/Utils.js';

export class StartServerCommand extends BaseCommand {
    public readonly name = 'start-server';
    public readonly description = 'Start the War-Games simulation server';
    public readonly category = 'Infrastructure';

    public register(program: CommanderCommand): void {
        program
            .command(this.name)
            .description(this.description)
            .option('-p, --port <number>', 'Port to listen on', (val) => parseInt(val, 10))
            .option('-l, --log-level <level>', 'Log level (debug, info, warn, error)', 'info')
            .action((options) => this.execute(options.port, options.logLevel));
    }

    protected async execute(port?: number, logLevel?: string): Promise<void> {
        console.log(`${C.blue}${C.bold}Starting War-Games Server...${C.reset}`);
        
        try {
            const { port: finalPort } = await startServer(port, logLevel);
            console.log(`${C.green}${C.bold}✔ Server is up and running on port ${finalPort}${C.reset}`);
            console.log(`${C.dim}Press Ctrl+C to stop the server${C.reset}\n`);
            
            // Keep the process alive
            process.on('SIGINT', () => {
                console.log(`\n${C.yellow}Stopping server...${C.reset}`);
                process.exit(0);
            });
            
        } catch (err: any) {
            console.error(`\n${C.red}${C.bold}✖ Failed to start server:${C.reset} ${err.message}`);
            process.exit(1);
        }
    }
}

import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { C } from '../core/Utils.js';
import { createServer } from '../../server_v2/server.js';

interface StartServerOptions {
    port?: number;
    logLevel: string;
}

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
            .action((options: StartServerOptions) => this.execute(options.port, options.logLevel));
    }

    protected async execute(port?: number, logLevel?: string): Promise<void> {
        console.log(`${C.blue}${C.bold}Starting War-Games Server...${C.reset}`);

        try {
            const finalPort = port || 3000;
            const app = await createServer();
            await app.listen({ port: finalPort, host: '0.0.0.0' });
            
            console.log(`${C.green}${C.bold}✔ V2 Server is up and running on port ${finalPort}${C.reset}`);
            console.log(`${C.dim}Press Ctrl+C to stop the server${C.reset}\n`);

            // Keep the process alive
            process.on('SIGINT', () => {
                console.log(`\n${C.yellow}Stopping server...${C.reset}`);
                process.exit(0);
            });

        } catch (err: unknown) {
            const error = err as Error;
            console.error(`\n${C.red}${C.bold}✖ Failed to start server:${C.reset} ${error.message}\n${C.red}${error.stack}${C.reset}`);
            process.exit(1);
        }
    }
}

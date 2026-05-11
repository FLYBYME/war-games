import { Command } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { createWorkerNode } from '../../server_v2/worker_node.js';
import { C } from '../core/Utils.js';

export class StartWorkerCommand extends BaseCommand {
    public readonly name = 'worker:start';
    public readonly description = 'Start a standalone worker node process';
    public readonly category = 'Infrastructure';

    public register(program: Command): void {
        program
            .command(this.name)
            .description(this.description)
            .option('-p, --port <number>', 'Port to listen on', (val) => parseInt(val), 8080)
            .option('--cache <path>', 'Path to terrain disk cache', './data/terrain_storage')
            .action(async (options) => {
                process.env.TERRAIN_DISK_CACHE = options.cache;
                await this.execute(options.port);
            });
    }

    protected async execute(port: number): Promise<void> {
        console.log(`\n${C.blue}${C.bold}WAR-GAMES WORKER NODE${C.reset}`);
        console.log(`${C.dim}Mode: Dedicated Service${C.reset}`);
        console.log(`${C.dim}Port: ${port}${C.reset}`);
        console.log(`${C.dim}PID:  ${process.pid}${C.reset}\n`);

        await createWorkerNode(port);
    }
}

import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient } from '../../sdk/WarGamesClient.js';
import { C } from '../core/Utils.js';

export class ListMatchesCommand extends BaseCommand {
    public readonly name = 'list-matches';
    public readonly description = 'List all active simulation matches on the server';
    public readonly category = 'Tactical';

    public register(program: CommanderCommand): void {
        program
            .command(this.name)
            .description(this.description)
            .action((options, command) => {
                const globalOpts = command.optsWithGlobals();
                this.execute(globalOpts.url);
            });
    }

    protected async execute(url: string): Promise<void> {
        const client = new WarGamesClient({
            url: url,
            connectTimeoutMs: 2000
        });

        try {
            // Using fetch via the SDK's internal base URL derivation logic if possible, 
            // but for simplicity here we'll just derive the HTTP URL.
            const httpUrl = url.replace(/^ws/, 'http');
            const res = await fetch(`${httpUrl}/api/matches`);
            
            if (!res.ok) {
                throw new Error(`Server returned ${res.status}: ${res.statusText}`);
            }

            const matches = await res.json() as any[];

            if (matches.length === 0) {
                console.log(`${C.yellow}No active matches found on server.${C.reset}`);
            } else {
                console.log(`\n${C.bold}${'MATCH ID'.padEnd(20)} ${'TICK'.padEnd(10)} ${'UNITS'}${C.reset}`);
                console.log(`${C.dim}${'-'.repeat(40)}${C.reset}`);
                
                matches.forEach(m => {
                    console.log(`${C.cyan}${m.id.padEnd(20)}${C.reset} ${m.tick.toString().padEnd(10)} ${C.green}${m.entityCount}${C.reset}`);
                });
                console.log();
            }

        } catch (err: any) {
            console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`);
        } finally {
            client.disconnect();
        }
    }
}

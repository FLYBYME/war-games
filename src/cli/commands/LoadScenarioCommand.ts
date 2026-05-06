import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from '../core/BaseCommand.js';
import { WarGamesClient } from '../../sdk/WarGamesClient.js';
import { C } from '../core/Utils.js';

export class LoadScenarioCommand extends BaseCommand {
    public readonly name = 'load-scenario';
    public readonly description = 'List or load a scenario into the engine';
    public readonly category = 'Infrastructure';

    public register(program: CommanderCommand): void {
        program
            .command(this.name)
            .description(this.description)
            .argument('[filename]', 'Filename of the scenario to load')
            .action((filename, options, command) => {
                const globalOpts = command.optsWithGlobals();
                this.execute(filename, globalOpts.url);
            });
    }

    protected async execute(filename?: string, url: string = 'ws://localhost:3000'): Promise<void> {
        const client = new WarGamesClient({
            url: url,
            connectTimeoutMs: 2000
        });

        try {
            if (filename) {
                console.log(`${C.dim}Loading scenario: ${C.reset}${C.cyan}${filename}${C.reset}...`);
                // Note: loadScenarioIntoEngine expects a filename, but we are using IDs for display
                const result = await client.scenario.loadScenarioIntoEngine(filename);
                if (result.success) {
                    console.log(`${C.green}${C.bold}✔ Scenario loaded successfully.${C.reset}`);
                    if (result.name) console.log(`${C.dim}Name: ${C.reset}${result.name}`);
                    if (result.matchId) console.log(`${C.dim}Match ID: ${C.reset}${C.yellow}${result.matchId}${C.reset}`);
                } else {
                    console.error(`${C.red}${C.bold}✖ Failed to load scenario.${C.reset}`);
                }
            } else {
                console.log(`${C.dim}Fetching available scenarios...${C.reset}\n`);
                const scenarios = await client.scenario.listScenarios();

                if (scenarios.length === 0) {
                    console.log(`${C.yellow}No scenarios found on server.${C.reset}`);
                } else {
                    console.log(`${C.bold}${'ID'.padEnd(25)} ${'NAME'.padEnd(40)} ${'UNITS'}${C.reset}`);
                    console.log(`${C.dim}${'-'.repeat(75)}${C.reset}`);

                    scenarios.forEach(s => {
                        console.log(`${C.cyan}${s.filename.padEnd(25)}${C.reset} ${s.name.padEnd(40)} ${C.yellow}${s.entityCount}${C.reset}`);
                    });
                    console.log(`\n${C.dim}Use 'load-scenario <id>' to load one of these.${C.reset}`);
                }
            }

        } catch (err: any) {
            console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} ${err.message}`);
            if (err.message.includes('ECONNREFUSED')) {
                console.error(`${C.yellow}Make sure the server is running (npm run cli start-server)${C.reset}`);
            }
        } finally {
            client.disconnect();
        }
    }
}

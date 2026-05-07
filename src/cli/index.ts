import { Command } from 'commander';
import { CommandRegistry } from './core/CommandRegistry.js';
import { InspectMatchCommand } from './commands/InspectMatchCommand.js';
import { StudyCommand } from './commands/StudyCommand.js';
import { StartServerCommand } from './commands/StartServerCommand.js';
import { LoadScenarioCommand } from './commands/LoadScenarioCommand.js';
import { SpawnUnitCommand } from './commands/SpawnUnitCommand.js';
import { SimControlCommand } from './commands/SimControlCommand.js';
import { ListMatchesCommand } from './commands/ListMatchesCommand.js';
import { ServerMetricsCommand } from './commands/ServerMetricsCommand.js';
import { DuelCommand } from './commands/DuelCommand.js';
import { BugsCommand } from './commands/BugsCommand.js';
import { DebugAgentCommand } from './commands/DebugAgentCommand.js';
import { C } from './core/Utils.js';

const program = new Command();
const registry = new CommandRegistry();

// Register Commands
registry.register(new InspectMatchCommand());
registry.register(new StudyCommand());
registry.register(new StartServerCommand());
registry.register(new LoadScenarioCommand());
registry.register(new SpawnUnitCommand());
registry.register(new SimControlCommand());
registry.register(new ListMatchesCommand());
registry.register(new ServerMetricsCommand());
registry.register(new DuelCommand());
registry.register(new BugsCommand());
registry.register(new DebugAgentCommand());

program
    .name('war-games')
    .description('War-Games Engine CLI')
    .version('1.0.0')
    .option('--url <url>', 'Server URL (global)', 'ws://localhost:3000');

// Attach registry commands to program
registry.attachToProgram(program);

// Override help to use our stylized output
program.on('--help', () => {
    registry.printHelp();
});

// Custom help command
program
    .command('help', { hidden: true })
    .action(() => {
        registry.printHelp();
    });

// Handle unknown commands
program.on('command:*', () => {
    console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} Invalid command.`);
    registry.printHelp();
    process.exit(1);
});

async function main() {
    try {
        await program.parseAsync(process.argv);
    } catch (err: unknown) {
        const error = err as Error;
        console.error(`\n${C.red}${C.bold}✖ Critical Failure:${C.reset} ${error.message}`);
        process.exit(1);
    }
}

void main();

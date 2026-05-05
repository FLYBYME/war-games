import { Command } from 'commander';
import { CommandRegistry } from './core/CommandRegistry.js';
import { InspectMatchCommand } from './commands/InspectMatchCommand.js';
import { StudyCommand } from './commands/StudyCommand.js';
import { StartServerCommand } from './commands/StartServerCommand.js';
import { C } from './core/Utils.js';

const program = new Command();
const registry = new CommandRegistry();

// Register Commands
registry.register(new InspectMatchCommand());
registry.register(new StudyCommand());
registry.register(new StartServerCommand());

program
    .name('war-games')
    .description('War-Games Engine CLI')
    .version('1.0.0');

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
    } catch (err: any) {
        console.error(`\n${C.red}${C.bold}✖ Critical Failure:${C.reset} ${err.message}`);
        process.exit(1);
    }
}

main();

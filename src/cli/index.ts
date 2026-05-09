import { Command } from 'commander';
import { CommandRegistry } from './core/CommandRegistry.js';
import { StartServerCommand } from './commands/StartServerCommand.js';
import { GenerateCommand } from './commands/GenerateCommand.js';
import { SeedCommand } from './commands/SeedCommand.js';
import { WarGamesClientV2 } from '../sdk_v2/generated/WarGamesClientV2.js';
import { C } from './core/Utils.js';
import fs from 'fs';
import path from 'path';

const program = new Command();
const registry = new CommandRegistry();

// Register Commands
registry.register(new StartServerCommand());
registry.register(new GenerateCommand());
registry.register(new SeedCommand());

program
    .name('war-games')
    .description('War-Games Engine CLI')
    .version('1.0.0')
    .option('--url <url>', 'Server URL (global)', 'http://localhost:3000/api/v2'); // V2 API prefix required

// Attach registry commands to program
registry.attachToProgram(program);

// Load Generated Tool Commands if they exist
async function loadGeneratedCommands() {
    const generatedPath = path.resolve('./src/cli/generated/ToolCommands.ts');
    
    if (fs.existsSync(generatedPath)) {
        try {
            // Use path to file for absolute import
            const { registerGeneratedCommands } = await import('./generated/ToolCommands.js');
            const options = program.opts();
            const client = new WarGamesClientV2(options.url || 'http://localhost:3000/api/v2');
            registerGeneratedCommands(program, client);
        } catch (err: any) {
            console.error(`\n${C.yellow}${C.bold}⚠ Warning:${C.reset} Failed to load generated tool commands: ${err.message}`);
        }
    }
}

// Override help to use our stylized output
program.on('--help', () => {
    registry.printHelp(program);
});

// Custom help command
program
    .command('help', { hidden: true })
    .action(() => {
        registry.printHelp(program);
    });

// Handle unknown commands
program.on('command:*', () => {
    console.error(`\n${C.red}${C.bold}✖ Error:${C.reset} Invalid command.`);
    registry.printHelp(program);
    process.exit(1);
});

async function main() {
    try {
        await loadGeneratedCommands();
        await program.parseAsync(process.argv);
    } catch (err: unknown) {
        const error = err as Error;
        console.error(`\n${C.red}${C.bold}✖ Critical Failure:${C.reset} ${error.message}`);
        process.exit(1);
    }
}

void main();

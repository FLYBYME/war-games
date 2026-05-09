import { Command as CommanderCommand } from 'commander';
import { BaseCommand } from './BaseCommand.js';
import { C } from './Utils.js';

export class CommandRegistry {
    private commands: BaseCommand[] = [];

    public register(command: BaseCommand): void {
        this.commands.push(command);
    }

    public attachToProgram(program: CommanderCommand): void {
        for (const cmd of this.commands) {
            cmd.register(program);
        }
    }

    public getCommandsByCategory(): Map<string, BaseCommand[]> {
        const groups = new Map<string, BaseCommand[]>();
        for (const cmd of this.commands) {
            if (!groups.has(cmd.category)) {
                groups.set(cmd.category, []);
            }
            groups.get(cmd.category)!.push(cmd);
        }
        return groups;
    }

    public printHelp(program?: CommanderCommand): void {
        const groups = this.getCommandsByCategory();
        console.log(`\n${C.magenta}${C.bold}WAR-GAMES CLI${C.reset}\n`);

        console.log(`${C.yellow}${C.bold}Global Options:${C.reset}`);
        console.log(`  ${C.cyan}${C.bold}${'--url <url>'.padEnd(18)}${C.reset} ${C.dim}Server URL (default: ws://localhost:3000)${C.reset}\n`);

        for (const [category, commands] of groups) {
            console.log(`${C.blue}${C.bold}${category}${C.reset}`);
            for (const cmd of commands) {
                const aliases = cmd.aliases.length ? ` ${C.dim}(${cmd.aliases.join(', ')})${C.reset}` : '';
                console.log(`  ${C.cyan}${C.bold}${cmd.name.padEnd(18)}${C.reset}${aliases} ${C.dim}${cmd.description}${C.reset}`);
            }
            console.log();
        }

        // Print generated commands from Commander that aren't in the registry
        if (program) {
            const registryCommandNames = new Set(this.commands.map(c => c.name));
            // Also filter out 'help' command if it's hidden or redundant
            const externalCommands = program.commands.filter(c => !registryCommandNames.has(c.name()) && c.name() !== 'help');

            if (externalCommands.length > 0) {
                console.log(`${C.blue}${C.bold}Tactical Tools (V2)${C.reset}`);
                for (const cmd of externalCommands) {
                    console.log(`  ${C.cyan}${C.bold}${cmd.name().padEnd(18)}${C.reset} ${C.dim}${cmd.description()}${C.reset}`);
                }
                console.log();
            }
        }
    }
}

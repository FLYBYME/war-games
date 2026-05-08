import { Command } from './Command.js';
import { World } from './World.js';

export interface CommandHandler<T extends Command> {
    execute(command: T, world: World): void;
}

/**
 * CommandDispatcher: Decouples command execution logic from the World.
 */
export class CommandDispatcher {
    private handlers = new Map<string, CommandHandler<Command>>();

    /**
     * Register a handler for a specific command class.
     */
    public register<T extends Command>(commandClass: Function, handler: CommandHandler<T>): void {
        this.handlers.set(commandClass.name, handler as unknown as CommandHandler<Command>);
    }

    /**
     * Dispatch a command to its registered handler.
     */
    public dispatch(command: Command, world: World): void {
        const handler = this.handlers.get(command.constructor.name);
        if (handler) {
            handler.execute(command, world);
        } else {
            console.warn(`No handler registered for command: ${command.constructor.name}`);
        }
    }
}

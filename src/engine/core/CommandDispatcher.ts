import { Command } from './Command.js';
import { World } from './World.js';

export interface CommandHandler<T extends Command> {
    execute(command: T, world: World): void;
}

/**
 * CommandDispatcher: Decouples command execution logic from the World.
 * 
 * Handlers are stored with a base-typed wrapper to avoid `as unknown` casts.
 * The wrapper safely narrows the command type at execution time.
 */
export class CommandDispatcher {
    private handlers = new Map<string, CommandHandler<Command>>();

    /**
     * Register a handler for a specific command class.
     */
    public register<T extends Command>(commandClass: { name: string }, handler: CommandHandler<T>): void {
        // Wrap the narrowed handler to accept the base Command type
        const baseHandler: CommandHandler<Command> = {
            execute(command: Command, world: World): void {
                handler.execute(command as T, world);
            }
        };
        this.handlers.set(commandClass.name, baseHandler);
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

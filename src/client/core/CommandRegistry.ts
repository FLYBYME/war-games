/**
 * CommandRegistry - Maps command IDs to executable functions
 * Powers the command palette and keyboard shortcuts
 */

import { IDE } from "./IDE";
import { EventBus } from "./EventBus";

export const CommandEvents = {
    COMMAND_EXECUTED: 'command.executed',
    COMMAND_ERROR: 'command.error',
}

export interface Command<T = any> {
    id: string;
    label: string;
    description?: string;
    category?: string;
    keybinding?: string;
    icon?: string;
    handler: (...args: T[]) => void | Promise<void>;
    when?: () => boolean; // Context condition for availability
}

export interface CommandExecutionResult {
    commandId: string;
    success: boolean;
    result?: any;
    error?: Error;
    timestamp: number;
}

export class CommandRegistry extends EventBus {
    private commands: Map<string, Command<any>> = new Map();
    private history: CommandExecutionResult[] = [];
    private readonly maxHistorySize = 50;
    private ide: IDE;

    constructor(ide: IDE) {
        super();
        this.ide = ide;
    }

    /**
     * Register a command
     */
    public register(command: Command<any>): void {
        if (this.commands.has(command.id)) {
            console.warn(`CommandRegistry: Overwriting command "${command.id}"`);
        }
        this.commands.set(command.id, command);
    }

    /**
     * Register a command and return a disposable for easy cleanup
     */
    public registerDisposable(command: Command<any>): { dispose: () => void } {
        this.register(command);
        return {
            dispose: () => this.unregister(command.id)
        };
    }

    /**
     * Register multiple commands at once
     */
    public registerMany(commands: Command<any>[]): void {
        for (const command of commands) {
            this.register(command);
        }
    }

    /**
     * Execute a command by ID
     */
    public async execute<T>(commandId: string, ...args: T[]): Promise<CommandExecutionResult> {
        const command = this.commands.get(commandId);
        const result: CommandExecutionResult = {
            commandId,
            success: false,
            timestamp: Date.now(),
        };

        if (!command) {
            result.error = new Error(`Command "${commandId}" not found`);
            this.addToHistory(result);
            console.error(`CommandRegistry: Command "${commandId}" not found`);
            return result;
        }

        // Check if command is available in current context
        if (command.when && !command.when()) {
            result.error = new Error(`Command "${commandId}" is not available in current context`);
            this.addToHistory(result);
            console.error(`CommandRegistry: Command "${commandId}" is not available in current context`);
            return result;
        }

        try {
            result.result = await command.handler(...args);
            result.success = true;
            console.log(`CommandRegistry: Executed "${commandId}"`);
            this.emit(CommandEvents.COMMAND_EXECUTED, { commandId, args, result: result.result });
        } catch (error) {
            result.error = error instanceof Error ? error : new Error(String(error));
            console.error(`CommandRegistry: Error executing "${commandId}"`, error);
            this.emit(CommandEvents.COMMAND_ERROR, { commandId, args, error });
        }

        this.addToHistory(result);
        return result;
    }

    /**
     * Get a command by ID
     */
    public get(commandId: string): Command | undefined {
        return this.commands.get(commandId);
    }

    /**
     * Check if a command exists
     */
    public has(commandId: string): boolean {
        return this.commands.has(commandId);
    }

    /**
     * Unregister a command
     */
    public unregister(commandId: string): boolean {
        return this.commands.delete(commandId);
    }

    /**
     * Get all registered commands
     */
    public getAll(): Command[] {
        return Array.from(this.commands.values());
    }

    /**
     * Get commands filtered by category
     */
    public getByCategory(category: string): Command[] {
        return this.getAll().filter((cmd) => cmd.category === category);
    }

    /**
     * Search commands by label or description
     */
    public search(query: string): Command[] {
        const lowerQuery = query.toLowerCase();
        return this.getAll().filter(
            (cmd) =>
                cmd.label.toLowerCase().includes(lowerQuery) ||
                cmd.description?.toLowerCase().includes(lowerQuery) ||
                cmd.id.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get available commands (respecting "when" conditions)
     */
    public getAvailable(): Command[] {
        return this.getAll().filter((cmd) => !cmd.when || cmd.when());
    }

    /**
     * Get command by keybinding
     */
    public getByKeybinding(keybinding: string): Command | undefined {
        return this.getAll().find((cmd) => cmd.keybinding === keybinding);
    }

    /**
     * Get execution history
     */
    public getHistory(): CommandExecutionResult[] {
        return [...this.history];
    }

    private addToHistory(result: CommandExecutionResult): void {
        this.history.push(result);
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Clear registry (for testing)
     */
    public clear(): void {
        this.commands.clear();
        this.history = [];
    }
}

// Common command categories
export const CommandCategories = {
    FILE: 'File',
    EDIT: 'Edit',
    VIEW: 'View',
    GO: 'Go',
    RUN: 'Run',
    TERMINAL: 'Terminal',
    HELP: 'Help',
    GIT: 'Git',
    AGENT: 'Agent',
} as const;

// Common command IDs
export const CommandIds = {
    // File commands
    FILE_NEW: 'file.new',
    FILE_OPEN: 'file.open',
    FILE_SAVE: 'file.save',
    FILE_SAVE_AS: 'file.saveAs',
    FILE_SAVE_ALL: 'file.saveAll',
    FILE_CLOSE: 'file.close',
    FILE_CLOSE_ALL: 'file.closeAll',

    // Edit commands
    EDIT_UNDO: 'edit.undo',
    EDIT_REDO: 'edit.redo',
    EDIT_CUT: 'edit.cut',
    EDIT_COPY: 'edit.copy',
    EDIT_PASTE: 'edit.paste',
    EDIT_FIND: 'edit.find',
    EDIT_REPLACE: 'edit.replace',
    EDIT_FORMAT: 'edit.format',

    // View commands
    VIEW_COMMAND_PALETTE: 'view.commandPalette',
    VIEW_TOGGLE_SIDEBAR: 'view.toggleSidebar',
    VIEW_TOGGLE_TERMINAL: 'view.toggleTerminal',
    VIEW_TOGGLE_AGENT: 'view.toggleAgent',
    VIEW_ZOOM_IN: 'view.zoomIn',
    VIEW_ZOOM_OUT: 'view.zoomOut',

    // Go commands
    GO_TO_LINE: 'go.toLine',
    GO_TO_FILE: 'go.toFile',
    GO_TO_SYMBOL: 'go.toSymbol',
    GO_BACK: 'go.back',
    GO_FORWARD: 'go.forward',

    // Agent commands
    AGENT_OPEN_CHAT: 'agent.openChat',
    AGENT_SEND_MESSAGE: 'agent.sendMessage',
    AGENT_CLEAR_HISTORY: 'agent.clearHistory',
} as const;

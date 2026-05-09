/**
 * LogLevel: Defined log severity levels.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';

/**
 * LOG_PRIORITIES: Mapping of levels to numeric priority for filtering.
 */
const LOG_PRIORITIES: Record<LogLevel, number> = {
    'trace': 0,
    'debug': 1,
    'info': 2,
    'warn': 3,
    'error': 4
};

/**
 * Logger: The central logging facility for the Simulation Engine.
 * Built for high-performance simulations with minimal allocation overhead.
 */
export class Logger {
    private static globalLevel: LogLevel = 'info';

    constructor(private prefix: string = 'ENGINE') { }

    /**
     * setLevel: Updates the minimum logging level globally.
     */
    public static setLevel(level: LogLevel): void {
        Logger.globalLevel = level;
    }

    /**
     * setLevel: Instance-level method to update global logging level.
     */
    public setLevel(level: LogLevel): void {
        Logger.globalLevel = level;
    }

    /**
     * format: Internal string formatter for log entries.
     */
    private format(level: LogLevel, message: string, context?: Record<string, unknown>): string {
        const timestamp = new Date().toISOString();
        const ctxStr = context ? ` | ${JSON.stringify(context)}` : '';
        const prefixStr = this.prefix ? `[${this.prefix}] ` : '';
        
        // Use a clean, professional format
        return `[${timestamp}] ${prefixStr}[${level.toUpperCase()}] ${message}${ctxStr}`;
    }

    /**
     * shouldLog: Determines if a message meets the current severity threshold.
     */
    private shouldLog(level: LogLevel): boolean {
        return LOG_PRIORITIES[Logger.globalLevel] <= LOG_PRIORITIES[level];
    }

    /**
     * trace: Extremely granular diagnostic information.
     */
    public trace(message: string, context?: Record<string, unknown>): void {
        if (this.shouldLog('trace')) {
            console.debug(this.format('trace', message, context));
        }
    }

    /**
     * debug: Technical information useful during development.
     */
    public debug(message: string, context?: Record<string, unknown>): void {
        if (this.shouldLog('debug')) {
            console.debug(this.format('debug', message, context));
        }
    }

    /**
     * info: General operational milestones.
     */
    public info(message: string, context?: Record<string, unknown>): void {
        if (this.shouldLog('info')) {
            console.info(this.format('info', message, context));
        }
    }

    /**
     * warn: Non-critical issues that may require attention.
     */
    public warn(message: string, context?: Record<string, unknown>): void {
        if (this.shouldLog('warn')) {
            console.warn(this.format('warn', message, context));
        }
    }

    /**
     * error: Critical failures that impact system functionality.
     */
    public error(message: string, context?: Record<string, unknown>): void {
        if (this.shouldLog('error')) {
            console.error(this.format('error', message, context));
        }
    }
}

/**
 * Export a default singleton for engine-wide use.
 */
export const logger = new Logger('ENGINE');

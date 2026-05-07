export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_PRIORITIES: Record<LogLevel, number> = {
    'debug': 0,
    'info': 1,
    'warn': 2,
    'error': 3
};

export class Logger {
    private static globalLevel: LogLevel = 'info';

    constructor(private prefix: string = '') { }

    public setLevel(level: LogLevel) {
        Logger.globalLevel = level;
    }

    public static setLevel(level: LogLevel) {
        Logger.globalLevel = level;
    }

    private format(level: LogLevel, message: string, context?: unknown) {
        const timestamp = new Date().toISOString();
        const ctxStr = context ? ` | ${JSON.stringify(context)}` : '';
        const prefixStr = this.prefix ? `[${this.prefix}] ` : '';
        return `[${timestamp}] ${prefixStr}[${level.toUpperCase()}] ${message}${ctxStr}`;
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_PRIORITIES[Logger.globalLevel] <= LOG_PRIORITIES[level];
    }

    public info(message: string, context?: unknown) {
        if (this.shouldLog('info')) {
            console.info(this.format('info', message, context));
        }
    }

    public warn(message: string, context?: unknown) {
        if (this.shouldLog('warn')) {
            console.warn(this.format('warn', message, context));
        }
    }

    public error(message: string, context?: unknown) {
        if (this.shouldLog('error')) {
            console.error(this.format('error', message, context));
        }
    }

    public debug(message: string, context?: unknown) {
        if (this.shouldLog('debug')) {
            console.debug(this.format('debug', message, context));
        }
    }
}

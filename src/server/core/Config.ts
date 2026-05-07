export interface ServerConfig {
    port: number;
    tickRateMs: number;
    heartbeatIntervalMs: number;
    logLevel: 'info' | 'warn' | 'error' | 'debug';
}

const getLogLevel = (): 'info' | 'warn' | 'error' | 'debug' => {
    const level = process.env.LOG_LEVEL;
    if (level === 'info' || level === 'warn' || level === 'error' || level === 'debug') {
        return level;
    }
    return 'info';
};

export const config: ServerConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    tickRateMs: parseInt(process.env.TICK_RATE_MS || '100', 10),
    heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || (process.env.NODE_ENV === 'test' ? '1000' : '30000'), 10),
    logLevel: getLogLevel()
};

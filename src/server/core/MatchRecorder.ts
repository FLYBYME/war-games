import { IStorageProvider, ILogger } from '../services/types.js';
import { SimulationEvent } from '../../engine/core/Types.js';

/**
 * MatchRecorder: Records simulation events to JSONL files.
 */
export class MatchRecorder {
    private readonly logDir: string;

    constructor(
        private storage: IStorageProvider,
        private logger: ILogger,
        baseDir: string
    ) {
        this.logDir = this.storage.join(baseDir, 'logs/matches');
        this.ensureLogDir();
    }

    private async ensureLogDir() {
        try {
            if (!(await this.storage.exists(this.logDir))) {
                await this.storage.mkdir(this.logDir, { recursive: true });
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`Failed to create log directory: ${this.logDir}`, { error: message });
        }
    }

    public async recordEvent(matchId: string, event: SimulationEvent) {
        // Skip high-frequency performance metrics to save disk space
        if (event.type === 'metrics:performance') return;

        const logPath = this.storage.join(this.logDir, `${matchId}.jsonl`);
        const line = JSON.stringify(event) + '\n';

        try {
            await this.storage.appendFile(logPath, line);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`Failed to record event for match ${matchId}`, { error: message });
        }
    }

    public async finalize(matchId: string) {
        this.logger.info(`Finalizing match record for ${matchId}`);
        // For JSONL, we don't strictly need a footer, but we could add a final event
        await this.recordEvent(matchId, {
            type: 'MatchFinalized',
            tick: -1,
            data: { timestamp: Date.now() }
        } as any);
    }
}

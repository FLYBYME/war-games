/**
 * SimulationClock: Manages temporal configuration for a single simulation instance.
 * Decouples time compression and pause state for multi-tenant isolation.
 */
export interface TickSchedule {
    steps: number;
    delayMs: number;
    useImmediate: boolean;
}

export class SimulationClock {
    public timeCompression: number = 1.0;
    public isPaused: boolean = false;
    public tickRateMs: number = 100;

    /**
     * getSchedule: Determines how many simulation steps to take and how long to wait
     * before the next pulse based on current time compression.
     */
    public getSchedule(): TickSchedule {
        if (this.isPaused) {
            return { steps: 0, delayMs: 1000, useImmediate: false };
        }

        let steps = 1;
        let delayMs = this.tickRateMs / Math.max(0.1, this.timeCompression);

        // High-speed optimization: Batch ticks to avoid event loop overhead
        if (this.timeCompression > 50) {
            steps = Math.min(100, Math.floor(this.timeCompression / 10));
            delayMs = (this.tickRateMs * steps) / this.timeCompression;
        }

        return {
            steps,
            delayMs: Math.max(1, delayMs),
            useImmediate: this.timeCompression > 500
        };
    }

    public setCompression(rate: number): void {
        this.timeCompression = Math.max(0.1, rate);
    }

    public setPaused(paused: boolean): void {
        this.isPaused = paused;
    }
}

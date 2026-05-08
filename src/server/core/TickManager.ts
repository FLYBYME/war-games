import { MatchService } from '../services/MatchService.js';
import { ILogger } from '../services/types.js';

/**
 * TickManager: Orchestrates independent simulation loops for multiple matches.
 * This is the core of the multi-tenant simulation architecture.
 */
export class TickManager {
    private timers = new Map<string, NodeJS.Timeout | NodeJS.Immediate>();

    constructor(
        private matchService: MatchService,
        private logger: ILogger
    ) {
        // Listen for time changes to re-adjust individual match loops
        this.matchService.setOnMatchTimeChanged((matchId) => {
            this.restartLoop(matchId);
        });

        // Auto-manage loops for new matches
        this.matchService.setOnMatchCreated((matchId) => {
            this.startLoop(matchId);
        });

        this.matchService.setOnMatchDeleted((matchId) => {
            this.stopLoop(matchId);
        });
    }

    /**
     * startLoop: Begins a dedicated heartbeat for a match.
     */
    public startLoop(matchId: string) {
        this.logger.info(`Starting dedicated tick loop for match: ${matchId}`);
        this.restartLoop(matchId);
    }

    /**
     * stopLoop: Terminates the heartbeat for a match.
     */
    public stopLoop(matchId: string) {
        const timer = this.timers.get(matchId);
        if (timer) {
            // Using type guards for timer types
            if ('unref' in timer && typeof timer.unref === 'function') {
                clearTimeout(timer as NodeJS.Timeout);
            } else {
                clearImmediate(timer as NodeJS.Immediate);
            }
            this.timers.delete(matchId);
        }
    }

    /**
     * stopAll: Terminates all active heartbeats.
     */
    public stopAll() {
        for (const matchId of Array.from(this.timers.keys())) {
            this.stopLoop(matchId);
        }
    }

    private restartLoop(matchId: string) {
        this.stopLoop(matchId);
        
        const world = this.matchService.getMatch(matchId);
        if (!world || world.clock.isPaused) return;

        const runTick = async () => {
            // Check pause state again inside the loop
            if (world.clock.isPaused) {
                this.timers.delete(matchId);
                return;
            }

            try {
                const schedule = world.clock.getSchedule();
                if (schedule.steps === 0) {
                    this.timers.delete(matchId);
                    return;
                }

                const baseDt = world.clock.tickRateMs / 1000;
                for (let i = 0; i < schedule.steps; i++) {
                    await world.tick(baseDt);
                }

                // Schedule next pulse based on clock requirements
                if (schedule.useImmediate) {
                    this.timers.set(matchId, setImmediate(runTick));
                } else {
                    this.timers.set(matchId, setTimeout(runTick, Math.max(1, schedule.delayMs)));
                }
            } catch (err: unknown) {
                const error = err as Error;
                this.logger.error(`Simulation tick failed for match ${matchId}`, { error: error.message });
                // Retry after a safety delay
                this.timers.set(matchId, setTimeout(runTick, 1000));
            }
        };

        void runTick();
    }
}

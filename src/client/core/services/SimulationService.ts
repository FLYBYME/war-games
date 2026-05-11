import { Signal } from '../Signal';
import { WarGamesClientV2 } from '@sdk/generated/WarGamesClientV2';
import { MatchService } from './MatchService';
import { SimStreamService } from './SimStreamService';
import * as Contracts from '@sdk/contracts';

/**
 * SimulationService — Reactive source of truth for the active simulation's state.
 * 
 * Subscribes to the simulation event stream and exposes signals for:
 * - isPaused
 * - timeCompression
 * - currentTick
 * - phaseTimes (for performance monitoring)
 */
export class SimulationService {
    private client: WarGamesClientV2;
    private stream: SimStreamService;
    private matches: MatchService;

    // ── Reactive State ───────────────────────────────────────────────────────
    public readonly isPaused = new Signal<boolean>(true);
    public readonly timeCompression = new Signal<number>(1);
    public readonly currentTick = new Signal<number>(0);
    public readonly phaseTimes = new Signal<Record<string, number>>({});

    private unsubStream: (() => void) | null = null;

    constructor(client: WarGamesClientV2, stream: SimStreamService, matches: MatchService) {
        this.client = client;
        this.stream = stream;
        this.matches = matches;

        // Auto-subscribe when a match is activated
        this.matches.currentMatchId.subscribe((matchId) => {
            if (matchId) {
                this.connect(matchId);
            } else {
                this.disconnect();
            }
        });
    }

    /**
     * Connect to the simulation stream for a match.
     */
    private async connect(matchId: string): Promise<void> {
        this.disconnect();

        // 1. Initial State Fetch
        try {
            const sim = await this.client.api.sim.get({ matchId });
            this.isPaused.set(sim.isPaused);
            this.timeCompression.set(sim.timeCompression);
            this.currentTick.set(sim.tick);
        } catch (err) {
            console.error('SimulationService: Failed to fetch initial state', err);
        }

        // 2. Subscribe to Stream
        this.unsubStream = this.stream.subscribe(matchId, (event) => {
            this.handleEvent(event);
        });
    }

    /**
     * Tear down stream subscription.
     */
    private disconnect(): void {
        if (this.unsubStream) {
            this.unsubStream();
            this.unsubStream = null;
        }
        // Optional: reset state? usually we keep it for the last view
    }

    /**
     * Handle incoming simulation events and update signals.
     */
    private handleEvent(event: Contracts.SimulationEvent): void {
        switch (event.type) {
            case 'SimulationSpeedChanged': {
                const result = Contracts.SimulationSpeedChangedEventSchema.safeParse(event);
                if (result.success) {
                    const { isPaused, timeCompression } = result.data.data;
                    this.isPaused.set(isPaused);
                    this.timeCompression.set(timeCompression);
                }
                break;
            }
            case 'TickCompleted': {
                this.currentTick.set(event.tick);
                // Cast or safeParse for phaseTimes if needed
                if (event.data && typeof event.data === 'object' && 'phaseTimes' in event.data) {
                    this.phaseTimes.set(event.data.phaseTimes as Record<string, number>);
                }
                break;
            }
        }
    }

    /**
     * Command: Toggle Play/Pause
     */
    public async togglePause(): Promise<void> {
        const matchId = this.matches.currentMatchId.get();
        if (!matchId) return;

        const isPaused = this.isPaused.get();
        if (isPaused) {
            await this.client.api.sim.resume({ matchId });
        } else {
            await this.client.api.sim.pause({ matchId });
        }
    }

    /**
     * Command: Set Time Compression
     */
    public async setTimeCompression(value: number): Promise<void> {
        const matchId = this.matches.currentMatchId.get();
        if (!matchId) return;

        await this.client.api.sim.set_speed({ matchId, timeCompression: value });
    }

    /**
     * Command: Step Simulation
     */
    public async step(ticks: number = 1): Promise<void> {
        const matchId = this.matches.currentMatchId.get();
        if (!matchId) return;

        await this.client.api.sim.step({ matchId, ticks });
    }
}

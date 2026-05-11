/**
 * SimStreamService — Multiplexed simulation event stream.
 *
 * Maintains exactly ONE SSE connection per matchId and multicasts events
 * to all subscribers. Uses reference counting to auto-open/close the stream.
 */

import { WarGamesClientV2 } from '@sdk/generated/WarGamesClientV2';
import { SimulationEvent } from '@sdk/contracts/domain/events.schema';

export type SimEventCallback = (event: SimulationEvent) => void;

interface StreamState {
    matchId: string;
    callbacks: Set<SimEventCallback>;
    abortController: AbortController;
    running: boolean;
}

export class SimStreamService {
    private client: WarGamesClientV2;
    private activeStream: StreamState | null = null;

    constructor(client: WarGamesClientV2) {
        this.client = client;
    }

    /**
     * Subscribe to the simulation event stream for a given match.
     * If this is the first subscriber, the SSE connection is opened.
     * Returns an unsubscribe function.
     */
    public subscribe(matchId: string, callback: SimEventCallback): () => void {
        // If we're subscribed to a different match, tear down the old stream
        if (this.activeStream && this.activeStream.matchId !== matchId) {
            this.teardown();
        }

        // Create stream state if needed
        if (!this.activeStream) {
            this.activeStream = {
                matchId,
                callbacks: new Set(),
                abortController: new AbortController(),
                running: false,
            };
        }

        this.activeStream.callbacks.add(callback);

        // Start the stream loop if not already running
        if (!this.activeStream.running) {
            this.startStreamLoop(this.activeStream);
        }

        // Return unsubscribe function
        return () => {
            if (!this.activeStream) return;
            this.activeStream.callbacks.delete(callback);

            // Reference counting: last subscriber tears down
            if (this.activeStream.callbacks.size === 0) {
                this.teardown();
            }
        };
    }

    /**
     * Get the current subscriber count (useful for debugging).
     */
    public getSubscriberCount(): number {
        return this.activeStream?.callbacks.size ?? 0;
    }

    /**
     * Forcibly close the active stream.
     */
    public teardown(): void {
        if (!this.activeStream) return;
        this.activeStream.abortController.abort();
        this.activeStream.callbacks.clear();
        this.activeStream.running = false;
        this.activeStream = null;
    }

    /**
     * Clean up on dispose.
     */
    public dispose(): void {
        this.teardown();
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private async startStreamLoop(state: StreamState): Promise<void> {
        state.running = true;

        try {
            const eventStream = this.client.api.sim.get_stream({ matchId: state.matchId });

            for await (const event of eventStream) {
                // Check if we were torn down while iterating
                if (state !== this.activeStream || state.abortController.signal.aborted) {
                    break;
                }

                // Dispatch to all subscribers
                for (const cb of state.callbacks) {
                    try {
                        cb(event);
                    } catch (err) {
                        console.error('SimStreamService: subscriber error', err);
                    }
                }
            }
        } catch (error) {
            // Only log if we weren't intentionally aborted
            if (!state.abortController.signal.aborted) {
                console.error('SimStreamService: stream error', error);
            }
        } finally {
            state.running = false;
        }
    }
}

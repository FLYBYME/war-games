/**
 * MatchService — Core execution context for the entire application.
 *
 * Holds the active matchId and side as Signals.
 * Extensions read these values explicitly and pass them to SDK calls.
 * The service never touches the DOM.
 */

import { Signal } from '../Signal';
import { WarGamesClientV2 } from '@sdk/generated/WarGamesClientV2';
import { Match, MatchStatus } from '@sdk/contracts/match/match.schema';

// ─── Side Type ───────────────────────────────────────────────────────────────

export type ForceSide = 'blue' | 'red' | 'observer';

// ─── Lifecycle Events ────────────────────────────────────────────────────────

export const MatchServiceEvents = {
    MATCH_SELECTED: 'match:selected',
    MATCH_ACTIVATED: 'match:activated',
    MATCH_DEACTIVATED: 'match:deactivated',
    MATCH_REFRESHED: 'match:refreshed',
} as const;

// ─── Service ─────────────────────────────────────────────────────────────────

export class MatchService {
    private client: WarGamesClientV2;

    // ── Reactive State ───────────────────────────────────────────────────────
    public readonly currentMatch = new Signal<Match | null>(null);
    public readonly currentMatchId = new Signal<string | null>(null);
    public readonly currentSide = new Signal<ForceSide>('observer');
    public readonly isLoading = new Signal<boolean>(false);
    public readonly status = new Signal<MatchStatus | null>(null);

    // ── Event emitter (provided by IDE.commands on wiring) ───────────────────
    private emitter: { emit: (event: string, data?: unknown) => void } | null = null;

    constructor(client: WarGamesClientV2) {
        this.client = client;
    }

    /**
     * Provide an emitter for lifecycle events (typically IDE.commands).
     */
    public setEmitter(emitter: { emit: (event: string, data?: unknown) => void }): void {
        this.emitter = emitter;
    }

    /**
     * Select and activate a match by ID.
     * This is the primary lifecycle transition: Staging → Loading → Active.
     */
    public async selectMatch(matchId: string): Promise<void> {
        // Deactivate previous match if any
        const previousId = this.currentMatchId.get();
        if (previousId) {
            this.emitter?.emit(MatchServiceEvents.MATCH_DEACTIVATED, { matchId: previousId });
        }

        this.currentMatchId.set(matchId);
        this.isLoading.set(true);
        this.emitter?.emit(MatchServiceEvents.MATCH_SELECTED, { matchId });

        try {
            const match = await this.client.api.match.get({ matchId });
            this.currentMatch.set(match);
            this.status.set(match.status);
            this.isLoading.set(false);
            this.emitter?.emit(MatchServiceEvents.MATCH_ACTIVATED, { matchId, match });
        } catch (error) {
            console.error('MatchService: Failed to load match', error);
            this.currentMatch.set(null);
            this.currentMatchId.set(null);
            this.status.set(null);
            this.isLoading.set(false);
        }
    }

    /**
     * Set the active force perspective (Blue, Red, or Observer).
     */
    public setSide(side: ForceSide): void {
        this.currentSide.set(side);
    }

    /**
     * Refresh the current match state from the server.
     */
    public async refresh(): Promise<void> {
        const matchId = this.currentMatchId.get();
        if (!matchId) return;

        try {
            const match = await this.client.api.match.get({ matchId });
            this.currentMatch.set(match);
            this.status.set(match.status);
            this.emitter?.emit(MatchServiceEvents.MATCH_REFRESHED, { matchId, match });
        } catch (error) {
            console.error('MatchService: Failed to refresh match', error);
        }
    }

    /**
     * Deactivate the current match (return to Staging state).
     */
    public deactivate(): void {
        const matchId = this.currentMatchId.get();
        if (matchId) {
            this.emitter?.emit(MatchServiceEvents.MATCH_DEACTIVATED, { matchId });
        }
        this.currentMatch.set(null);
        this.currentMatchId.set(null);
        this.status.set(null);
    }

    /**
     * Clean up resources.
     */
    public dispose(): void {
        this.deactivate();
    }
}

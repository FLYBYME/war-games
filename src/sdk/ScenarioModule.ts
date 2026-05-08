import type { WarGamesClient } from "./WarGamesClient.js";
import { 
    ViewStatePayload as ViewState, 
    Side, 
    MatchInfo, 
    TacticalEvent, 
    EntityProfile,
    ScenarioManifest
} from "./schemas/index.js";

export class ScenarioModule {
    constructor(private client: WarGamesClient) { }
    async getCurrentState(): Promise<ViewState | null> {
        return await this.client.getLatestViewState();
    }
    async listMatches(): Promise<MatchInfo[]> {
        return await this.client.listMatches();
    }
    async deleteMatch(matchId: string): Promise<{ success: boolean }> {
        return await this.client.deleteMatch(matchId);
    }
    async queryWinState(matchId: string): Promise<{ over: boolean, winner?: string }> {
        return await this.client.queryWinState(matchId);
    }
    async getRecentEvents(matchId: string, count: number = 50): Promise<TacticalEvent[]> {
        return await this.client.getRecentEvents(matchId, count);
    }
    async getProfile(profileId: string): Promise<EntityProfile | null> {
        return await this.client.getProfile(profileId);
    }
    exportScenario(): Promise<ScenarioManifest> {
        return new Promise((resolve) => {
            this.client.events.once('scenario:exported', (payload: ScenarioManifest) => {
                resolve(payload);
            });
            this.client.dispatchImmediate({
                type: 'EXPORT_SCENARIO',
                matchId: this.client.currentMatchId || 'default'
            });
        });
    }
    importScenario(payload: ScenarioManifest, options: { matchId?: string; side?: Side } = {}): Promise<{ success: boolean }> {
        if (options.side) { this.client.side = options.side; }
        return new Promise((resolve) => {
            this.client.events.once('scenario:imported', (result: { success: boolean }) => { resolve(result); });
            this.client.dispatchImmediate({
                type: 'IMPORT_SCENARIO',
                matchId: options.matchId || this.client.currentMatchId || 'default',
                payload: payload as Record<string, unknown>
            });
        });
    }
    async fetchProfiles(): Promise<{ units: [string, EntityProfile][], weapons: [string, unknown][] }> {
        return await this.client.apiFetch('/api/database/profiles');
    }
    async saveProfile(id: string, profile: EntityProfile): Promise<{ success: boolean }> {
        return await this.client.apiFetch('/api/database/profiles', { method: 'POST', body: JSON.stringify({ id, profile }) });
    }
    async listScenarios(): Promise<{ filename: string; name: string; description: string; entityCount: number }[]> {
        return await this.client.apiFetch('/api/scenarios');
    }
    async getScenario(filename: string): Promise<ScenarioManifest | null> {
        return await this.client.apiFetch<ScenarioManifest>(`/api/scenarios/${encodeURIComponent(filename)}`);
    }
    async saveScenario(filename: string, manifest: ScenarioManifest): Promise<{ success: boolean }> {
        return await this.client.apiFetch('/api/scenarios', { method: 'POST', body: JSON.stringify({ filename, manifest }) });
    }
    async deleteScenario(filename: string): Promise<{ success: boolean }> {
        return await this.client.apiFetch(`/api/scenarios/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    }
    async loadScenarioIntoEngine(filename: string): Promise<{ success: boolean; name?: string; entityCount?: number; matchId?: string }> { 
        return await this.client.apiFetch('/api/scenarios/load', { method: 'POST', body: JSON.stringify({ filename }) }); 
    }
    async getTelemetry(matchId: string): Promise<Record<string, unknown[]>> { 
        return await this.client.apiFetch(`/api/matches/${encodeURIComponent(matchId)}/telemetry`); 
    }
}

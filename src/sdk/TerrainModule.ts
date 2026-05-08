import type { WarGamesClient } from "./WarGamesClient.js";

export class TerrainModule {
    constructor(private client: WarGamesClient) { }
    async fetchManifest(): Promise<{ regions: unknown[] }> {
        return await this.client.apiFetch('/api/terrain/manifest');
    }
    async fetchStats(): Promise<{ regions: number; cachedEngineTiles: number; cachedUITiles: number; engineSizeMb: number; uiSizeMb: number; memoryCacheSize: number; pendingJobs: string[]; }> {
        return await this.client.apiFetch('/api/terrain/stats');
    }
    async clearCache(): Promise<{ success: boolean }> {
        return await this.client.apiFetch('/api/terrain/clear-cache', { method: 'POST' });
    }
    async fetchTile(lat: number, lon: number): Promise<ArrayBuffer> {
        return await this.client.apiFetch(`/api/terrain/tiles/${lat}/${lon}`);
    }
    async fetchUITile(lat: number, lon: number): Promise<ArrayBuffer> {
        return await this.client.apiFetch(`/api/terrain/ui-tiles/${lat}/${lon}`);
    }
}

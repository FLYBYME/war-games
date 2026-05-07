import { UIStore } from '../UIStore';
import { Signal } from '../Signal';
import { logger } from '../Logger';
import { MapRegion } from '../../shared/types.js';
import { WgtFormat } from '../../../engine/environment/utils/WgtFormat.js';

export interface PipelineData {
    regions: MapRegion[];
    borders: unknown[]; // GeoJSON
    eez: unknown[];
}

export interface WgtTile {
    resolution: number;
    lat: number;
    lon: number;
    data: Float32Array;
}

/**
 * MapDataPipeline: Manages the flow of map data into the renderer.
 * Handles fetching, fallback logic, and geographic synchronization.
 */
export class MapDataPipeline {
    private static instance: MapDataPipeline;
    public data = new Signal<PipelineData>({ regions: [], borders: [], eez: [] });
    public isLoading = new Signal<boolean>(false);
    
    private tileCache = new Map<string, WgtTile>();
    private pendingTiles = new Map<string, Promise<WgtTile>>();
    private activeRequests = 0;
    private maxConcurrentRequests = 6;
    private requestQueue: (() => void)[] = [];

    private constructor() {
        // Automatically fetch data when currentMatchId changes
        UIStore.currentMatchId.subscribe(() => this.fetchData());
    }

    public static getInstance(): MapDataPipeline {
        if (!MapDataPipeline.instance) MapDataPipeline.instance = new MapDataPipeline();
        return MapDataPipeline.instance;
    }

    public async init() {
        await this.fetchData();
    }

    private async fetchData() {
        this.isLoading.set(true);
        try {
            // Wait for client to be initialized if needed
            let attempts = 0;
            while (!UIStore.client && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!UIStore.client) {
                throw new Error('SDK Client not initialized after timeout');
            }

            logger.info('MapDataPipeline: Fetching map data manifest');
            const manifest = await UIStore.client.terrain.fetchManifest();
            
            this.data.set({
                regions: manifest?.regions || [],
                borders: [], // Future: Fetch from /api/terrain/borders
                eez: []
            });
            
            logger.info('MapDataPipeline: Manifest loaded', { 
                regions: manifest?.regions?.length || 0
            });
        } catch (err) {
            logger.warn('MapDataPipeline: Failed to fetch map manifest', { 
                error: err instanceof Error ? err.message : String(err) 
            });
            // Provide empty fallback
            this.data.set({ regions: [], borders: [], eez: [] });
        } finally {
            this.isLoading.set(false);
        }
    }

    /**
     * Fetches and decodes a WGT tile for the given lat/lon.
     * Results are cached to prevent redundant network requests.
     */
    public async getTile(lat: number, lon: number): Promise<WgtTile | null> {
        const floorLat = Math.floor(lat);
        const floorLon = Math.floor(lon);
        const key = `${floorLat},${floorLon}`;

        if (this.tileCache.has(key)) {
            return this.tileCache.get(key)!;
        }

        if (this.pendingTiles.has(key)) {
            return this.pendingTiles.get(key)!;
        }

        const promise = (async () => {
            // Throttle
            if (this.activeRequests >= this.maxConcurrentRequests) {
                await new Promise<void>(resolve => this.requestQueue.push(resolve));
            }

            this.activeRequests++;
            try {
                logger.debug(`MapDataPipeline: Fetching tile ${key} (Active: ${this.activeRequests})`);
                const buffer = await UIStore.client.terrain.fetchUITile(floorLat, floorLon);
                const tile = WgtFormat.decode(buffer);
                this.tileCache.set(key, tile);
                return tile;
            } catch (err) {
                logger.error(`MapDataPipeline: Failed to fetch tile ${key}`, { err });
                throw err;
            } finally {
                this.activeRequests--;
                this.pendingTiles.delete(key);
                
                // Process queue
                if (this.requestQueue.length > 0) {
                    const next = this.requestQueue.shift();
                    if (next) next();
                }
            }
        })();

        this.pendingTiles.set(key, promise);
        return promise;
    }

    /**
     * Synchronously looks up elevation if the tile is already in cache.
     */
    public getElevationSync(lat: number, lon: number): number | null {
        const floorLat = Math.floor(lat);
        const floorLon = Math.floor(lon);
        const key = `${floorLat},${floorLon}`;

        const tile = this.tileCache.get(key);
        if (!tile) return null;

        const res = tile.resolution;
        const fracLat = lat - floorLat;
        const fracLon = lon - floorLon;

        // Row-major, top-to-bottom (row 0 = north)
        const row = Math.floor((1 - fracLat) * (res - 1));
        const col = Math.floor(fracLon * (res - 1));
        
        const idx = row * res + col;
        return tile.data[idx] ?? null;
    }

    /**
     * Helper to get assets for a specific region.
     * Implements fallback logic if assets are missing.
     */
    public async getRegionAssets(regionId: string) {
        // Since /metadata is gone, this will likely fail for raster textures.
        // The layers should handle the error and use a vector fallback.
        try {
            // For now, we just return the URL, the layer handles the load
            return {
                landUrl: `/maps/${regionId}/land.png`,
                waterUrl: `/maps/${regionId}/water.png`
            };
        } catch (err) {
            return null;
        }
    }
}

export const mapDataPipeline = MapDataPipeline.getInstance();

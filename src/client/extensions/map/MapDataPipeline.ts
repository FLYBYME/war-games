import { Signal } from '../../core/Signal';
import { WgtFormat } from '../../../engine/environment/utils/WgtFormat';
import { TerrainCache } from './TerrainCache';
import { TheaterBundleFormat } from '../../../engine/environment/utils/TheaterBundleFormat';

export interface WgtTile {
    resolution: number;
    lat: number;
    lon: number;
    data: Float32Array | Int16Array;
}

/**
 * MapDataPipeline: Manages the flow of map data into the renderer.
 * Optimized for Binary QuadTree (z/x/y) transport.
 */
export class MapDataPipeline {
    public isLoading = new Signal<boolean>(false);

    private tileCache = new Map<string, WgtTile>();
    private pendingTiles = new Map<string, Promise<WgtTile | null>>();
    private activeRequests = 0;
    private maxConcurrentRequests = 6;
    private requestQueue: (() => void)[] = [];
    private persistentCache = new TerrainCache();
    
    // We hit the binary endpoint directly to bypass SDK/JSON overhead
    private baseUrl: string;

    constructor(baseUrl: string = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * getQuadTile: Retrieves a QuadTree tile. L1 (RAM) -> L2 (IDB) -> L3 (Network)
     */
    public async getQuadTile(z: number, x: number, y: number): Promise<WgtTile | null> {
        const key = `quad_${z}_${x}_${y}`;

        // 1. RAM Cache (L1)
        if (this.tileCache.has(key)) return this.tileCache.get(key)!;
        
        // 2. Pending Requests
        if (this.pendingTiles.has(key)) return this.pendingTiles.get(key)!;

        const promise = (async () => {
            // 3. Persistent Cache (L2 - IndexedDB)
            const cachedData = await this.persistentCache.getTile(z, x, y);
            if (cachedData) {
                const decoded = WgtFormat.decode(cachedData);
                const tile: WgtTile = {
                    resolution: decoded.resolution,
                    lat: decoded.lat,
                    lon: decoded.lon,
                    data: decoded.data
                };
                this.tileCache.set(key, tile);
                return tile;
            }

            // 4. Network Fallback (L3) - Individual fetch if not batched
            if (this.activeRequests >= this.maxConcurrentRequests) {
                await new Promise<void>(resolve => this.requestQueue.push(resolve));
            }

            this.activeRequests++;
            this.isLoading.set(true);

            try {
                const response = await fetch(`${this.baseUrl}/api/v2/terrain/tile/quad/${z}/${x}/${y}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const buffer = await response.arrayBuffer();
                const uint8 = new Uint8Array(buffer);
                
                // Save to L2
                await this.persistentCache.putTile(z, x, y, uint8);

                const decoded = WgtFormat.decode(buffer);
                const tile: WgtTile = {
                    resolution: decoded.resolution,
                    lat: decoded.lat,
                    lon: decoded.lon,
                    data: decoded.data
                };

                this.tileCache.set(key, tile);
                return tile;
            } catch (err) {
                console.warn(`MapDataPipeline: Failed to fetch quad tile ${key}`, err);
                return null;
            } finally {
                this.activeRequests--;
                this.pendingTiles.delete(key);
                if (this.activeRequests === 0) this.isLoading.set(false);
                
                const next = this.requestQueue.shift();
                if (next) next();
            }
        })();

        this.pendingTiles.set(key, promise);
        return promise;
    }

    /**
     * fetchViewport: Intelligently batches requests for a set of tiles.
     * This is the "Smart" part of the pipeline.
     */
    public async fetchViewport(tiles: { z: number; x: number; y: number }[]): Promise<void> {
        // 1. Filter out what we already have (RAM or IDB)
        const missing: { z: number; x: number; y: number }[] = [];
        
        for (const t of tiles) {
            const key = `quad_${t.z}_${t.x}_${t.y}`;
            if (this.tileCache.has(key)) continue;
            
            const inPersistent = await this.persistentCache.getTile(t.z, t.x, t.y);
            if (inPersistent) {
                // Pre-warm RAM cache
                const decoded = WgtFormat.decode(inPersistent);
                this.tileCache.set(key, {
                    resolution: decoded.resolution,
                    lat: decoded.lat,
                    lon: decoded.lon,
                    data: decoded.data
                });
                continue;
            }

            if (this.pendingTiles.has(key)) continue;
            missing.push(t);
        }

        if (missing.length === 0) return;

        // 2. Request Bundle for missing tiles
        this.isLoading.set(true);
        console.log(`🌐 SmartPipeline: Requesting bundle for ${missing.length} tiles...`);

        try {
            const response = await fetch(`${this.baseUrl}/api/v2/terrain/theater/bundle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tiles: missing })
            });

            if (!response.ok) throw new Error(`Bundle request failed: ${response.status}`);

            const buffer = await response.arrayBuffer();
            const entries = TheaterBundleFormat.unpack(new Uint8Array(buffer));

            // 3. Unpack and Save to Cache
            const saveTasks = entries.map(async (entry) => {
                const key = `quad_${entry.z}_${entry.x}_${entry.y}`;
                const decoded = WgtFormat.decode(entry.data);
                
                this.tileCache.set(key, {
                    resolution: decoded.resolution,
                    lat: decoded.lat,
                    lon: decoded.lon,
                    data: decoded.data
                });

                return this.persistentCache.putTile(entry.z, entry.x, entry.y, entry.data);
            });

            await Promise.all(saveTasks);
            console.log(`✅ SmartPipeline: Bundle received and unpacked (${entries.length} tiles).`);
        } catch (err) {
            console.error('MapDataPipeline: Failed to fetch bundle', err);
        } finally {
            this.isLoading.set(false);
        }
    }

    /**
     * getDegreeTile: Fetches a raw 1x1 degree tile (Fallback/Sim mode).
     */
    public async getDegreeTile(lat: number, lon: number, resolution: number = 256): Promise<WgtTile | null> {
        const key = `deg_${lat}_${lon}_${resolution}`;

        if (this.tileCache.has(key)) return this.tileCache.get(key)!;
        if (this.pendingTiles.has(key)) return this.pendingTiles.get(key)!;

        const promise = (async () => {
            if (this.activeRequests >= this.maxConcurrentRequests) {
                await new Promise<void>(resolve => this.requestQueue.push(resolve));
            }

            this.activeRequests++;
            this.isLoading.set(true);

            try {
                const response = await fetch(`${this.baseUrl}/api/v2/terrain/tile/degree?lat=${lat}&lon=${lon}&res=${resolution}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const buffer = await response.arrayBuffer();
                const decoded = WgtFormat.decode(buffer);

                const tile: WgtTile = {
                    resolution: decoded.resolution,
                    lat: decoded.lat,
                    lon: decoded.lon,
                    data: decoded.data
                };

                this.tileCache.set(key, tile);
                return tile;
            } catch (err) {
                console.warn(`MapDataPipeline: Failed to fetch degree tile ${key}`, err);
                return null;
            } finally {
                this.activeRequests--;
                this.pendingTiles.delete(key);
                if (this.activeRequests === 0) this.isLoading.set(false);
                
                const next = this.requestQueue.shift();
                if (next) next();
            }
        })();

        this.pendingTiles.set(key, promise);
        return promise;
    }
}

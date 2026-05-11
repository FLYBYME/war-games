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

interface PendingTilePromise extends Promise<WgtTile | null> {
    resolver?: (val: WgtTile | null) => void;
}

/**
 * MapDataPipeline: Manages the flow of map data into the renderer.
 * Optimized for Binary QuadTree (z/x/y) transport.
 */
export class MapDataPipeline {
    public isLoading = new Signal<boolean>(false);

    private tileCache = new Map<string, WgtTile>();
    private pendingTiles = new Map<string, PendingTilePromise>();
    private activeRequests = 0;
    private maxConcurrentRequests = 6;
    private requestQueue: (() => void)[] = [];
    private persistentCache = new TerrainCache();
    private pendingBatchTiles = new Map<string, { z: number, x: number, y: number }>();
    private batchTimeout: any = null;
    
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
        const cached = this.tileCache.get(key);
        if (cached) return cached;
        
        // 2. Pending Requests
        const pending = this.pendingTiles.get(key);
        if (pending) return pending;

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

        this.pendingTiles.set(key, promise as PendingTilePromise);
        return promise;
    }

    /**
     * fetchViewport: Intelligently batches requests for a set of tiles.
     * Uses a short debounce to group overlapping calls from the renderer.
     */
    public async fetchViewport(tiles: { z: number; x: number; y: number }[]): Promise<void> {
        // 1. Filter out what we already have and add to pending batch IMMEDIATELY
        for (const t of tiles) {
            const key = `quad_${t.z}_${t.x}_${t.y}`;
            if (this.tileCache.has(key)) continue;
            if (this.pendingTiles.has(key)) continue;
            
            this.pendingBatchTiles.set(key, t);
            
            // Create a "Pre-Batch" promise that getQuadTile will wait on
            let resolver: (val: WgtTile | null) => void = () => {};
            const promise: PendingTilePromise = new Promise<WgtTile | null>(resolve => { resolver = resolve; });
            promise.resolver = resolver;
            
            this.pendingTiles.set(key, promise as PendingTilePromise);
        }

        // 2. Debounce the actual network request
        if (this.batchTimeout) return;

        this.batchTimeout = setTimeout(async () => {
            this.batchTimeout = null;
            
            // Re-verify what we still need (some might have loaded from IDB in the meantime)
            const missing: { z: number; x: number; y: number }[] = [];
            for (const [key, t] of this.pendingBatchTiles.entries()) {
                const cachedData = await this.persistentCache.getTile(t.z, t.x, t.y);
                if (cachedData) {
                    const decoded = WgtFormat.decode(cachedData);
                    const tile = {
                        resolution: decoded.resolution,
                        lat: decoded.lat,
                        lon: decoded.lon,
                        data: decoded.data
                    };
                    this.tileCache.set(key, tile);
                    const p = this.pendingTiles.get(key);
                    if (p?.resolver) p.resolver(tile);
                    this.pendingTiles.delete(key);
                } else {
                    missing.push(t);
                }
            }
            
            this.pendingBatchTiles.clear();
            if (missing.length === 0) {
                this.isLoading.set(false);
                return;
            }

            this.isLoading.set(true);
            console.log(`🌐 SmartPipeline: Batching ${missing.length} tiles...`);

            try {
                const response = await fetch(`${this.baseUrl}/api/v2/terrain/theater/bundle`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tiles: missing })
                });

                if (!response.ok) throw new Error(`Bundle failed: ${response.status}`);

                const buffer = await response.arrayBuffer();
                const entries = TheaterBundleFormat.unpack(new Uint8Array(buffer));

                const saveTasks = entries.map(async (entry) => {
                    const key = `quad_${entry.z}_${entry.x}_${entry.y}`;
                    const decoded = WgtFormat.decode(entry.data);
                    
                    const tile: WgtTile = {
                        resolution: decoded.resolution,
                        lat: decoded.lat,
                        lon: decoded.lon,
                        data: decoded.data
                    };

                    this.tileCache.set(key, tile);
                    
                    const p = this.pendingTiles.get(key);
                    if (p?.resolver) p.resolver(tile);
                    this.pendingTiles.delete(key);

                    return this.persistentCache.putTile(entry.z, entry.x, entry.y, entry.data);
                });

                await Promise.all(saveTasks);
                
                // Cleanup any missing from bundle
                missing.forEach(m => {
                    const key = `quad_${m.z}_${m.x}_${m.y}`;
                    const p = this.pendingTiles.get(key);
                    if (p?.resolver) {
                        p.resolver(null);
                        this.pendingTiles.delete(key);
                    }
                });

            } catch (err) {
                console.error('MapDataPipeline: Batch fetch failed', err);
                missing.forEach(m => {
                    const key = `quad_${m.z}_${m.x}_${m.y}`;
                    const p = this.pendingTiles.get(key);
                    if (p?.resolver) p.resolver(null);
                    this.pendingTiles.delete(key);
                });
            } finally {
                this.isLoading.set(false);
            }
        }, 100); // 100ms debounce to catch rapid panning frames
    }

    /**
     * getDegreeTile: Fetches a raw 1x1 degree tile (Fallback/Sim mode).
     */
    public async getDegreeTile(lat: number, lon: number, resolution: number = 256): Promise<WgtTile | null> {
        const key = `deg_${lat}_${lon}_${resolution}`;

        const cached = this.tileCache.get(key);
        if (cached) return cached;
        
        const pending = this.pendingTiles.get(key);
        if (pending) return pending;

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

        this.pendingTiles.set(key, promise as PendingTilePromise);
        return promise;
    }
}

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
    private serverStats = new Signal<any>(null);

    // We hit the binary endpoint directly to bypass SDK/JSON overhead
    private baseUrl: string;
    private apiBase: string;
    private terrainServer: string;

    constructor(terrainServer: string, apiBase: string, enableCaching: boolean = true) {
        this.terrainServer = terrainServer;
        this.apiBase = apiBase;
        this.baseUrl = `${terrainServer}${apiBase}/terrain`;
        this.persistentCache.enabled = enableCaching;

        setInterval(() => this.pollServerStats(), 5000);
        this.pollServerStats();
    }

    private async pollServerStats() {
        try {
            const resp = await fetch(`${this.terrainServer}${this.apiBase}/worker/stats`);
            if (resp.ok) {
                const data = await resp.json();
                this.serverStats.set(data);
            }
        } catch (e) { /* ignore */ }
    }

    public getServerStats() {
        return this.serverStats.get();
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

    private batchResolvers: (() => void)[] = [];

    private latestNeededTiles: { z: number; x: number; y: number }[] = [];

    /**
     * fetchViewport: Intelligently batches requests for a set of tiles.
     * Uses a short debounce to group overlapping calls from the renderer.
     */
    public async fetchViewport(tiles: { z: number; x: number; y: number }[]): Promise<void> {
        this.latestNeededTiles = tiles;

        // 1. Filter out what we already have and add to pending batch IMMEDIATELY
        for (const t of tiles) {
            const key = `quad_${t.z}_${t.x}_${t.y}`;
            if (this.tileCache.has(key)) continue;
            if (this.pendingTiles.has(key)) continue;

            this.pendingBatchTiles.set(key, t);

            // Create a "Pre-Batch" promise that getQuadTile will wait on
            let resolver: (val: WgtTile | null) => void = () => { };
            const promise: PendingTilePromise = new Promise<WgtTile | null>(resolve => { resolver = resolve; });
            promise.resolver = resolver;

            this.pendingTiles.set(key, promise as PendingTilePromise);
        }

        // 2. Throttling: Accumulate requests and fire every 300ms
        return new Promise(resolve => {
            this.batchResolvers.push(resolve);

            if (this.batchTimeout) return;

            this.batchTimeout = setTimeout(async () => {
                this.batchTimeout = null;
                const resolvers = [...this.batchResolvers];
                this.batchResolvers = [];

                // Re-verify what we still need and if it's still "relevant"
                const missing: { z: number; x: number; y: number }[] = [];
                const currentNeededKeys = new Set(this.latestNeededTiles.map(t => `quad_${t.z}_${t.x}_${t.y}`));

                for (const [key, t] of this.pendingBatchTiles.entries()) {
                    // Optimization: If the user panned/zoomed away, discard this tile from the batch
                    if (!currentNeededKeys.has(key)) {
                        const p = this.pendingTiles.get(key);
                        if (p?.resolver) p.resolver(null);
                        this.pendingTiles.delete(key);
                        continue;
                    }

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
                    resolvers.forEach(res => res());
                    return;
                }

                this.isLoading.set(true);

                // 3. Chunk into smaller batches (e.g. 16 tiles) to avoid server-side timeouts
                const CHUNK_SIZE = 16;
                const chunks: { z: number; x: number; y: number }[][] = [];
                for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
                    chunks.push(missing.slice(i, i + CHUNK_SIZE));
                }

                console.log(`🌐 SmartPipeline: Batching ${missing.length} tiles in ${chunks.length} chunks...`);

                const processChunk = async (chunk: { z: number; x: number; y: number }[]) => {
                    try {
                        const response = await fetch(`${this.baseUrl}/api/v2/terrain/theater/bundle`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tiles: chunk })
                        });

                        if (!response.ok) throw new Error(`Bundle failed: ${response.status}`);

                        const buffer = await response.arrayBuffer();
                        const entries = TheaterBundleFormat.unpack(new Uint8Array(buffer));
                        console.log(`🌐 SmartPipeline: Received ${entries.length} tiles Buffer size ${buffer.byteLength}`);

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
                    } catch (err) {
                        console.error('MapDataPipeline: Chunk fetch failed', err);
                        // Mark chunk tiles as failed
                        chunk.forEach(m => {
                            const key = `quad_${m.z}_${m.x}_${m.y}`;
                            const p = this.pendingTiles.get(key);
                            if (p?.resolver) {
                                p.resolver(null);
                                this.pendingTiles.delete(key);
                            }
                        });
                    }
                };

                try {
                    // Process all chunks in parallel
                    await Promise.all(chunks.map(processChunk));

                    // Final cleanup for any missing from all bundles (unlikely but safe)
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
                } finally {
                    this.isLoading.set(false);
                    resolvers.forEach(res => res());
                }
            }, 300);
        });
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

    /**
     * getStats: Returns current pipeline telemetry.
     */
    public getStats() {
        return {
            cacheSize: this.tileCache.size,
            activeRequests: this.activeRequests,
            queueDepth: this.requestQueue.length
        };
    }

    /**
     * getElevation: Samples elevation from the most detailed cached tile.
     */
    public getElevation(lat: number, lon: number): number | null {
        // Find all tiles containing this point
        const tiles = Array.from(this.tileCache.values()).filter(t => {
            return Math.abs(t.lat - lat) < 1.0 && Math.abs(t.lon - lon) < 1.0;
        });

        if (tiles.length === 0) return null;

        // Pick the one with highest resolution
        const best = tiles.reduce((prev, curr) => (curr.resolution > prev.resolution) ? curr : prev);
        
        // Sampling logic (approximate mapping)
        const res = best.resolution;
        const dLat = lat - Math.floor(lat);
        const dLon = lon - Math.floor(lon);
        
        const sx = Math.floor(dLon * (res - 1));
        const sy = Math.floor((1 - dLat) * (res - 1));
        
        if (sx < 0 || sx >= res || sy < 0 || sy >= res) return null;
        
        return best.data[sy * res + sx];
    }
}

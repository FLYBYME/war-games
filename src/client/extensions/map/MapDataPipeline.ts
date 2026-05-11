import { Signal } from '../../core/Signal';
import { WgtFormat } from '../../../engine/environment/utils/WgtFormat';

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
    
    // We hit the binary endpoint directly to bypass SDK/JSON overhead
    private baseUrl: string;

    constructor(baseUrl: string = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * getQuadTile: Fetches a pre-baked QuadTree tile from the remote node.
     */
    public async getQuadTile(z: number, x: number, y: number): Promise<WgtTile | null> {
        const key = `quad_${z}_${x}_${y}`;

        if (this.tileCache.has(key)) return this.tileCache.get(key)!;
        if (this.pendingTiles.has(key)) return this.pendingTiles.get(key)!;

        const promise = (async () => {
            if (this.activeRequests >= this.maxConcurrentRequests) {
                await new Promise<void>(resolve => this.requestQueue.push(resolve));
            }

            this.activeRequests++;
            this.isLoading.set(true);

            try {
                // Direct Binary Fetch
                const response = await fetch(`${this.baseUrl}/api/v2/terrain/tile/quad/${z}/${x}/${y}`);
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

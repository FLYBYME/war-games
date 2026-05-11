import { Signal } from '../../core/Signal';

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
    public isLoading = new Signal<boolean>(false);

    private tileCache = new Map<string, WgtTile>();
    private pendingTiles = new Map<string, Promise<WgtTile | null>>();
    private activeRequests = 0;
    private maxConcurrentRequests = 6;
    private requestQueue: (() => void)[] = [];
    private client: any;

    constructor(client: any) {
        this.client = client;
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
                // In a real run, this would be:
                // const buffer = await this.client.terrain.fetchUITile(floorLat, floorLon);
                // For now, returning null or a stub until client is fully wired
                return null;
            } catch (err) {
                console.error(`MapDataPipeline: Failed to fetch tile ${key}`, err);
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
}

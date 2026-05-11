import { Signal } from '../../core/Signal';
import { WarGamesClientV2 } from '../../../sdk_v2/generated/WarGamesClientV2';
import { WgtFormat } from '../../../engine/environment/utils/WgtFormat';

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
    private client: WarGamesClientV2;

    constructor(client: WarGamesClientV2) {
        this.client = client;
    }

    /**
     * Fetches and decodes a WGT tile for the given lat/lon.
     * Results are cached to prevent redundant network requests.
     */
    public async getTile(lat: number, lon: number, resolution: number = 256): Promise<WgtTile | null> {
        const floorLat = Math.floor(lat);
        const floorLon = Math.floor(lon);
        const key = `${floorLat},${floorLon}_${resolution}`;

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
            this.isLoading.set(true);
            try {
                // Fetch binary tile from the API
                const result = await this.client.api.env.get_terrain_tile({
                    lat: floorLat,
                    lon: floorLon,
                    targetResolution: resolution
                });

                if (!result || !result.data) {
                    return null;
                }

                // The SDK returns Uint8Array for binary data
                const decoded = WgtFormat.decode(result.data);
                const tile: WgtTile = {
                    resolution: decoded.resolution,
                    lat: decoded.lat,
                    lon: decoded.lon,
                    data: decoded.data
                };

                this.tileCache.set(key, tile);
                return tile;
            } catch (err) {
                console.error(`MapDataPipeline: Failed to fetch tile ${key}`, err);
                return null;
            } finally {
                this.activeRequests--;
                this.pendingTiles.delete(key);

                if (this.activeRequests === 0) {
                    this.isLoading.set(false);
                }

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

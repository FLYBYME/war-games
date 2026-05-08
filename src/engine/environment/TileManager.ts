import * as fs from 'fs/promises';
import { join } from 'path';
import { WgtFormat } from './utils/WgtFormat.js';
import { ITileProvider } from './TerrainOracle.js';

export interface TerrainTile {
    resolution: number;
    lat: number;
    lon: number;
    data: Float32Array;
}

/**
 * TileManager: Manages terrain data tiles with an LRU cache.
 */
export class TileManager implements ITileProvider {
    private cache = new Map<string, TerrainTile>();
    private readonly MAX_TILES = 100;

    constructor(private readonly terrainDir: string = join(process.cwd(), 'data/terrain/engine')) { }

    public async getTile(lat: number, lon: number): Promise<Float32Array | undefined> {
        const floorLat = Math.floor(lat);
        const floorLon = Math.floor(lon);
        const key = `${floorLat},${floorLon}`;

        if (this.cache.has(key)) {
            const tile = this.cache.get(key)!;
            // LRU: Refresh entry by moving to end of Map insertion order
            this.cache.delete(key);
            this.cache.set(key, tile);
            return tile.data;
        }

        const tile = await this.loadTileFromDisk(floorLat, floorLon);
        if (tile) {
            // Evict oldest if full
            if (this.cache.size >= this.MAX_TILES) {
                const oldestKey = this.cache.keys().next().value;
                if (oldestKey !== undefined) this.cache.delete(oldestKey);
            }
            this.cache.set(key, tile);
            return tile.data;
        }

        return undefined;
    }

    public getCachedTile(lat: number, lon: number): Float32Array | undefined {
        const floorLat = Math.floor(lat);
        const floorLon = Math.floor(lon);
        const key = `${floorLat},${floorLon}`;
        return this.cache.get(key)?.data;
    }

    private async loadTileFromDisk(lat: number, lon: number): Promise<TerrainTile | undefined> {
        // N34W118.wgt format (standard SRTM naming)
        const latPart = lat >= 0 ? `N${lat}` : `S${Math.abs(lat)}`;
        const lonPart = lon >= 0 ? `E${lon}` : `W${Math.abs(lon)}`;
        const fileName = `${latPart}${lonPart}.wgt`;
        const filePath = join(this.terrainDir, fileName);

        try {
            const buffer = await fs.readFile(filePath);
            const decoded = WgtFormat.decode(new Uint8Array(buffer));
            return decoded;
        } catch (err) {
            // console.warn(`Terrain tile not found: ${fileName}`);
            return undefined;
        }
    }

    public clearCache(): void {
        this.cache.clear();
    }
}

import { TerrainService } from './TerrainService.js';
import { WgtFormat } from '../../engine/environment/utils/WgtFormat.js';

/**
 * QuadTreeBaker: Stitches 1x1 degree SRTM files into global z/x/y tiles.
 * Uses Web Mercator (EPSG:3857) tiling scheme.
 */
export class QuadTreeBaker {
    private readonly TILE_SIZE = 256;

    constructor(private terrainService: TerrainService) { }

    /**
     * getTile: Generates a binary WGTv2 tile for a specific z/x/y coordinate.
     */
    public async getTile(z: number, x: number, y: number): Promise<Uint8Array> {
        // 1. Calculate geodetic bounds of the QuadTree tile
        const bounds = this.getTileBounds(z, x, y);

        console.log(`[QuadTreeBaker] Fetching tile z${z}/x${x}/y${y} `);

        // 2. Create the destination buffer (256x256)
        const destData = new Int16Array(this.TILE_SIZE * this.TILE_SIZE);

        let index = 0;
        const maxIndex = this.TILE_SIZE * this.TILE_SIZE;

        const start = performance.now();
        // 3. Sample the grid
        for (let row = 0; row < this.TILE_SIZE; row++) {
            const lat = bounds.maxLat - (row / (this.TILE_SIZE - 1)) * (bounds.maxLat - bounds.minLat);
            for (let col = 0; col < this.TILE_SIZE; col++) {
                const lon = bounds.minLon + (col / (this.TILE_SIZE - 1)) * (bounds.maxLon - bounds.minLon);

                index++;
                if (index > maxIndex) {
                    throw new Error(`[QuadTreeBaker] Fetched tile z${z}/x${x}/y${y} in ${index} iterations`);
                }
                // Fetch elevation (uses L1/L2 cache in TerrainService)
                // Note: This automatically handles 1x1 degree stitching internally via TerrainService
                const elevation = await this.terrainService.getElevation(lat, lon);
                destData[row * this.TILE_SIZE + col] = Math.round(elevation);
            }
        }
        const end = performance.now();
        console.log(`[QuadTreeBaker] Fetched tile z${z}/x${x}/y${y} in ${end - start}ms`);

        // 4. Encode to binary WGTv2
        return WgtFormat.encode(
            this.TILE_SIZE,
            bounds.minLat,
            bounds.minLon,
            destData
        );
    }

    /**
     * getTileBounds: Converts z/x/y to geodetic Lat/Lon bounds.
     */
    private getTileBounds(z: number, x: number, y: number) {
        const n = Math.pow(2, z);
        const lonMin = (x / n) * 360 - 180;
        const lonMax = ((x + 1) / n) * 360 - 180;

        const latMinRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n)));
        const latMaxRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));

        const latMin = (latMinRad * 180) / Math.PI;
        const latMax = (latMaxRad * 180) / Math.PI;

        return { minLat: latMin, maxLat: latMax, minLon: lonMin, maxLon: lonMax };
    }
}

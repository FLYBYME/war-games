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
     /**
      * getTile: Generates a binary WGTv2 tile for a specific z/x/y coordinate.
      */
     public async getTile(z: number, x: number, y: number): Promise<Uint8Array> {
         // 1. Calculate geodetic bounds of the QuadTree tile
         const bounds = this.getTileBounds(z, x, y);

         // 2. Create the destination buffer (256x256)
         const destData = new Int16Array(this.TILE_SIZE * this.TILE_SIZE);

         const start = performance.now();

         // Block Cache: We usually only span 1 or 4 1x1 degree tiles per QuadTile
         let currentTileLat = -999;
         let currentTileLon = -999;
         let currentTile: any = null;

         // 3. Sample the grid
         for (let row = 0; row < this.TILE_SIZE; row++) {
             const lat = bounds.maxLat - (row / (this.TILE_SIZE - 1)) * (bounds.maxLat - bounds.minLat);
             const floorLat = Math.floor(lat);

             for (let col = 0; col < this.TILE_SIZE; col++) {
                 const lon = bounds.minLon + (col / (this.TILE_SIZE - 1)) * (bounds.maxLon - bounds.minLon);
                 const floorLon = Math.floor(lon);

                 // Check if we need to load a new 1x1 block
                 if (floorLat !== currentTileLat || floorLon !== currentTileLon || !currentTile) {
                     currentTile = await this.terrainService.getTile(floorLat, floorLon, 1201);
                     currentTileLat = floorLat;
                     currentTileLon = floorLon;
                 }

                 // Sample directly from the block data (Disconnect from the cache manager)
                 const res = currentTile.resolution;
                 const dLat = lat - floorLat;
                 const dLon = lon - floorLon;

                 const sx = Math.round(dLon * (res - 1));
                 const sy = Math.round((1 - dLat) * (res - 1));

                 const idx = sy * res + sx;
                 destData[row * this.TILE_SIZE + col] = Math.round(currentTile.data[idx] || 0);
             }
         }
         const end = performance.now();
         console.log(`[QuadTreeBaker] Generated tile z${z}/x${x}/y${y} in ${end - start}ms`);

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

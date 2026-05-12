import { TerrainService } from './TerrainService.js';
import { WgtFormat } from '../../engine/environment/utils/WgtFormat.js';
import { SpatialDatabase } from './SpatialDatabase.js';

/**
 * QuadTreeBaker: Stitches 1x1 degree SRTM files into global z/x/y tiles.
 * Uses Web Mercator (EPSG:3857) tiling scheme.
 */
export class QuadTreeBaker {
    private readonly TILE_SIZE = 256;

    constructor(
        private terrainService: TerrainService,
        private spatialDb?: SpatialDatabase
    ) { }

    /**
      * getTile: Generates a binary WGTv2 tile for a specific z/x/y coordinate.
      */
     public async getTile(z: number, x: number, y: number): Promise<Uint8Array> {
         // 1. FAST PATH: Check SQLite Cache first
         if (this.spatialDb) {
             const cached = this.spatialDb.getQuadTile(z, x, y);
             if (cached) return cached;
         }

         // 2. Calculate geodetic bounds
         const bounds = this.getTileBounds(z, x, y);
         const sourceRes = z < 7 ? 32 : 1201; // Adaptive resolution for speed

         // 3. Pre-fetch all 1x1 tiles needed for this QuadTile
         const floorLatMin = Math.floor(bounds.minLat);
         const floorLatMax = Math.floor(bounds.maxLat);
         const floorLonMin = Math.floor(bounds.minLon);
         const floorLonMax = Math.floor(bounds.maxLon);

         const tileMap = new Map<string, any>();
         const fetchTasks: Promise<void>[] = [];

         // Limit pre-fetch for global tiles to avoid OOM
         const latRange = floorLatMax - floorLatMin;
         const lonRange = floorLonMax - floorLonMin;
         
         // If we are at very low zoom (z < 3), just use a flat tile or Base Globe directly
         // to avoid fetching 60,000 degree tiles.
         if (latRange * lonRange > 100) {
             const flatData = new Int16Array(this.TILE_SIZE * this.TILE_SIZE);
             return WgtFormat.encode(this.TILE_SIZE, bounds.minLat, bounds.minLon, flatData);
         }

         for (let fLat = floorLatMin; fLat <= floorLatMax; fLat++) {
             for (let fLon = floorLonMin; fLon <= floorLonMax; fLon++) {
                 const key = `${fLat},${fLon}_${sourceRes}`;
                 fetchTasks.push((async () => {
                     const tile = await this.terrainService.getTile(fLat, fLon, sourceRes);
                     tileMap.set(key, tile);
                 })());
             }
         }
         await Promise.all(fetchTasks);

         // 4. SYNCHRONOUS Sampling Loop (No awaits here!)
         const destData = new Int16Array(this.TILE_SIZE * this.TILE_SIZE);
         const start = performance.now();
         
         const latStep = (bounds.maxLat - bounds.minLat) / (this.TILE_SIZE - 1);
         const lonStep = (bounds.maxLon - bounds.minLon) / (this.TILE_SIZE - 1);

         for (let row = 0; row < this.TILE_SIZE; row++) {
             const lat = bounds.maxLat - row * latStep;
             const fLat = Math.floor(lat);
             const dLat = lat - fLat;

             for (let col = 0; col < this.TILE_SIZE; col++) {
                 const lon = bounds.minLon + col * lonStep;
                 const fLon = Math.floor(lon);
                 const dLon = lon - fLon;

                 const sourceTile = tileMap.get(`${fLat},${fLon}_${sourceRes}`);
                 if (!sourceTile) continue;

                 const res = sourceTile.resolution;
                 const sx = (dLon * (res - 1)) | 0;
                 const sy = ((1 - dLat) * (res - 1)) | 0;

                 destData[row * this.TILE_SIZE + col] = sourceTile.data[sy * res + sx];
             }
         }

         const encoded = WgtFormat.encode(this.TILE_SIZE, bounds.minLat, bounds.minLon, destData);

         // 5. Save to Cache
         if (this.spatialDb) {
             this.spatialDb.putQuadTile(z, x, y, encoded);
         }

         const end = performance.now();
         if (z >= 10) {
            console.log(`[QuadTreeBaker] Baked tile z${z}/x${x}/y${y} in ${(end - start).toFixed(2)}ms`);
         }

         return encoded;
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

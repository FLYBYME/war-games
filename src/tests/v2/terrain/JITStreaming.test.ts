import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerrainService } from '../../../server_v2/services/TerrainService.js';
import { HarvesterService } from '../../../server_v2/services/HarvesterService.js';
import { SpatialDatabase } from '../../../server_v2/services/SpatialDatabase.js';
import { WorkerService } from '../../../server_v2/services/WorkerService.js';
import { WgtFormat } from '../../../engine/environment/utils/WgtFormat.js';

describe('JIT Streaming Architecture', () => {
    let terrainService: TerrainService;
    let harvesterService: HarvesterService;
    let spatialDb: SpatialDatabase;
    let workerService: WorkerService;

    beforeEach(() => {
        // Mock dependencies
        workerService = new WorkerService();
        spatialDb = new SpatialDatabase(':memory:'); // Use in-memory for testing
        
        // Manual initialization of tables since it's a new memory DB
        spatialDb['db'].exec(`
            CREATE TABLE IF NOT EXISTS degree_tiles (
                lat INTEGER,
                lon INTEGER,
                res INTEGER,
                data BLOB,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (lat, lon, res)
            );
        `);

        harvesterService = new HarvesterService(null as any); // Don't need real terrain service for harvester mock
        vi.spyOn(harvesterService, 'requestPriorityTile');
        
        terrainService = new TerrainService(workerService, spatialDb, undefined, harvesterService);
    });

    it('should return a low-res fallback when high-res is missing', async () => {
        const lat = 45;
        const lon = 90;
        const lowRes = 32;
        const highRes = 1201;

        // 1. Pre-fill the "Base Globe" tile (res=32)
        const fakeData = new Int16Array(lowRes * lowRes).fill(500); // 500m elevation
        const encoded = WgtFormat.encode(lowRes, lat, lon, fakeData);
        spatialDb.putDegreeTile(lat, lon, lowRes, encoded);

        // 2. Request high-res (res=1201)
        // This should fail L2 (high-res), trigger Harvester, and return the L2 (low-res) fallback
        const tile = await terrainService.getTile(lat, lon, highRes);

        expect(tile.resolution).toBe(lowRes);
        expect(tile.data[0]).toBe(500);
        expect(harvesterService.requestPriorityTile).toHaveBeenCalledWith(lat, lon);
    });

    it('should return a flat tile if even the base globe is missing', async () => {
        const lat = -20;
        const lon = -30;
        
        // No data in DB
        const tile = await terrainService.getTile(lat, lon, 1201);

        expect(tile.resolution).toBe(1201);
        expect(tile.data.every(v => v === 0)).toBe(true); // Sea level
        expect(harvesterService.requestPriorityTile).toHaveBeenCalledWith(lat, lon);
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerrainService } from '../../../server_v2/services/TerrainService';
import { WgtFormat } from '../../../engine/environment/utils/WgtFormat';
import fs from 'fs';
import path from 'path';

vi.mock('fs');
vi.mock('path');
vi.mock('url', () => ({
    fileURLToPath: vi.fn(() => '/mock/path')
}));

describe('TerrainService', () => {
    let terrainService: TerrainService;
    let mockWorkerService: any;
    let mockSpatialDb: any;
    let mockZeroCopyElev: any;
    let mockPool: any;

    beforeEach(() => {
        vi.resetAllMocks();
        
        (fs.existsSync as any).mockReturnValue(true);
        (path.resolve as any).mockImplementation((...args: string[]) => args.join('/'));
        (path.join as any).mockImplementation((...args: string[]) => args.join('/'));
        (path.dirname as any).mockReturnValue('/mock/dir');

        mockPool = {
            execute: vi.fn().mockResolvedValue({ success: true, engineEncoded: new Uint8Array(32), lat: 0, lon: 0 }),
            getStats: vi.fn(() => ({ activeJobs: 0, queuedJobs: 0 }))
        };

        mockWorkerService = {
            createPool: vi.fn(),
            getPool: vi.fn(() => mockPool)
        };

        mockSpatialDb = {
            getDegreeTile: vi.fn(),
            putDegreeTile: vi.fn()
        };

        mockZeroCopyElev = {
            getElevationAt: vi.fn().mockReturnValue(null)
        };

        terrainService = new TerrainService(mockWorkerService, mockSpatialDb, mockZeroCopyElev);
    });

    it('L1 RAM Cache: Verify hit', async () => {
        const data = new Int16Array(1201 * 1201).fill(100);
        const encoded = WgtFormat.encode(1201, 10, 20, data);
        mockSpatialDb.getDegreeTile.mockReturnValue(encoded);
        
        const tile1 = await terrainService.getTile(10, 20, 1201);
        const tile2 = await terrainService.getTile(10, 20, 1201);
        
        expect(mockSpatialDb.getDegreeTile).toHaveBeenCalledTimes(1);
        expect(tile2).toBe(tile1);
    });

    it('L1 RAM Cache: Verify eviction when exceeding 100 tiles', async () => {
        const data = new Int16Array(1).fill(0);
        for (let i = 0; i < 101; i++) {
            const encoded = WgtFormat.encode(1, i, 0, data);
            mockSpatialDb.getDegreeTile.mockReturnValue(encoded);
            await terrainService.getTile(i, 0, 1);
        }
        expect(terrainService.getCacheStats().cachedTiles).toBe(100);
    });

    it('Active Job Deduplication: Ensure concurrent requests for the same tile return the same promise', async () => {
        let resolveWorker: any;
        const workerPromise = new Promise(resolve => { resolveWorker = resolve; });
        mockPool.execute.mockReturnValue(workerPromise);
        mockSpatialDb.getDegreeTile.mockReturnValue(null);
        (fs.existsSync as any).mockReturnValue(false);

        const p1 = terrainService.getTile(10, 10, 1201);
        const p2 = terrainService.getTile(10, 10, 1201);

        expect(p1).toStrictEqual(p2);

        const data = new Int16Array(1201 * 1201).fill(0);
        const encoded = WgtFormat.encode(1201, 10, 10, data);
        resolveWorker({ success: true, engineEncoded: encoded, lat: 10, lon: 10 });

        await p1;
        expect(mockPool.execute).toHaveBeenCalledTimes(1);
    });

    it('getElevation: Verify Northwest corner (row 0, col 0) coordinate mapping', async () => {
        const res = 1201;
        const data = new Int16Array(res * res).fill(0);
        data[0] = 999; 
        const encoded = WgtFormat.encode(res, 10, 20, data);
        mockSpatialDb.getDegreeTile.mockReturnValue(encoded);

        // N10E020 covers Lat 10.0 to 11.0.
        // Northwest corner is Lat 11.0, Lon 20.0.
        // We use 10.9999 to ensure floorLat stays 10.
        const elev = await terrainService.getElevation(10.9999, 20.0001);
        expect(elev).toBe(999);
    });

    it('getElevation: Verify Southeast corner (row res-1, col res-1) mapping', async () => {
        const res = 1201;
        const data = new Int16Array(res * res).fill(0);
        data[res * res - 1] = 888; 
        const encoded = WgtFormat.encode(res, 10, 20, data);
        mockSpatialDb.getDegreeTile.mockReturnValue(encoded);

        // Southeast corner is Lat 10.0, Lon 21.0.
        // We use 10.0001, 20.9999 to stay inside tile 10,20.
        const elev = await terrainService.getElevation(10.0001, 20.9999);
        expect(elev).toBe(888);
    });

    it('getElevationSync: Verify parity with getElevation for cached tiles', async () => {
        const res = 1201;
        const data = new Int16Array(res * res).fill(123);
        const encoded = WgtFormat.encode(res, 10, 20, data);
        mockSpatialDb.getDegreeTile.mockReturnValue(encoded);

        await terrainService.getTile(10, 20, 1201); 
        
        const syncElev = terrainService.getElevationSync(10.5, 20.5);
        const asyncElev = await terrainService.getElevation(10.5, 20.5);
        
        expect(syncElev).toBe(123);
        expect(syncElev).toBe(asyncElev);
    });

    it('Fallback Tile: Ensure it returns sea-level (0) for missing data', async () => {
        mockSpatialDb.getDegreeTile.mockReturnValue(null);
        (fs.existsSync as any).mockReturnValue(false);
        (terrainService as any).remoteNodeUrl = undefined;
        
        const tile = await terrainService.getTile(0, 0, 1201);
        expect(tile.data[0]).toBe(0);
    });

    it('LOS Calculation: Blocked path (terrain height > sample height)', async () => {
        const res = 1201;
        const data = new Int16Array(res * res).fill(0); 
        // Put a mountain at 0.5, 0.5 (middle of tile)
        const midIdx = Math.floor(0.5 * (res-1)) * res + Math.floor(0.5 * (res-1));
        data[midIdx] = 500;
        
        const encoded = WgtFormat.encode(res, 0, 0, data);
        mockSpatialDb.getDegreeTile.mockReturnValue(encoded);

        const p1 = { lat: 0.1, lon: 0.1, alt: 100 };
        const p2 = { lat: 0.9, lon: 0.9, alt: 100 };
        
        // Path goes through 0.5,0.5 at alt 100. Mountain is 500m. Should be blocked.
        const clear = await terrainService.isLineOfSightClear(p1, p2, 20);
        expect(clear).toBe(false);
    });

    it('SpatialDB Persistence: Ensure fetched tiles are saved to L2', async () => {
        const data = new Int16Array(1).fill(10);
        const encoded = WgtFormat.encode(1, 0, 0, data);
        
        mockPool.execute.mockResolvedValue({ success: true, engineEncoded: encoded, lat: 0, lon: 0 });
        mockSpatialDb.getDegreeTile.mockReturnValue(null);
        (fs.existsSync as any).mockReturnValue(false);

        await terrainService.getTile(0, 0, 1201);
        expect(mockSpatialDb.putDegreeTile).toHaveBeenCalled();
    });

    it('L3 Remote Fetch: Mock a successful fetch and verify cache population', async () => {
        (terrainService as any).remoteNodeUrl = 'http://remote';
        mockSpatialDb.getDegreeTile.mockReturnValue(null);
        (fs.existsSync as any).mockReturnValue(false);

        const data = new Int16Array(1).fill(200);
        const encoded = WgtFormat.encode(1, 0, 0, data);
        
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(encoded.buffer)
        });

        const tile = await terrainService.getTile(0, 0, 1);
        expect(tile.data[0]).toBe(200);
        expect(mockSpatialDb.putDegreeTile).toHaveBeenCalled();
    });

    it('getElevation: Verify Negative coordinate mapping (South/West)', async () => {
        const res = 1201;
        const data = new Int16Array(res * res).fill(0);
        data[0] = 777; 
        // SW corner of -10N, -20E (which is tile -10, -20)
        const encoded = WgtFormat.encode(res, -10, -20, data);
        mockSpatialDb.getDegreeTile.mockReturnValue(encoded);

        // NW corner of -10, -20 is Lat -9.0001, Lon -20.0001
        // Math.floor(-9.0001) = -10. Math.floor(-20.0001) = -21? No, floor(-20.0) is -20.
        const elev = await terrainService.getElevation(-9.0001, -19.9999);
        expect(elev).toBe(777);
    });

    it('getCacheStats: Verify return value accuracy', async () => {
        const data = new Int16Array(1).fill(0);
        mockSpatialDb.getDegreeTile.mockReturnValue(WgtFormat.encode(1, 0, 0, data));
        
        await terrainService.getTile(0, 0, 1);
        const stats = terrainService.getCacheStats();
        expect(stats.cachedTiles).toBe(1);
    });

    it('getElevationSync: Verify it returns null for cache misses', () => {
        const elev = terrainService.getElevationSync(55, 55);
        expect(elev).toBe(null);
    });

    it('L2 Disk Cache: Verify hit from legacy .wgt files', async () => {
        mockSpatialDb.getDegreeTile.mockReturnValue(null);
        (fs.existsSync as any).mockImplementation((p: string) => p.includes('5/5.wgt'));
        const data = new Int16Array(1).fill(75);
        const encoded = WgtFormat.encode(1, 5, 5, data);
        (fs.readFileSync as any).mockReturnValue(Buffer.from(encoded));

        const tile = await terrainService.getTile(5, 5, 1);
        expect(fs.readFileSync).toHaveBeenCalled();
        expect(tile.data[0]).toBe(75);
    });
});

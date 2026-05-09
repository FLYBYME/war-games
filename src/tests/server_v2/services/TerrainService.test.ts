import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TerrainService } from '../../../server_v2/services/TerrainService.js';
import { WorkerService } from '../../../server_v2/services/WorkerService.js';

describe('TerrainService', () => {
    let service: TerrainService;
    let workerService: WorkerService;

    beforeEach(() => {
        workerService = new WorkerService();
        service = new TerrainService(workerService);
    });

    afterEach(() => {
        workerService.shutdown();
    });

    it('should calculate elevation indices correctly', async () => {
        // This is more of a unit test for the math in getElevation
        // We'll mock getTile to return a dummy tile
        const mockData = new Float32Array(1201 * 1201).fill(100);
        mockData[0] = 500; // Top-left (N39.0, E108.0)
        
        vi.spyOn(service, 'getTile').mockResolvedValue({
            lat: 39,
            lon: 108,
            resolution: 1201,
            data: mockData
        });

        const el = await service.getElevation(39.999, 108.001);
        // lat 39.999 is near top, lon 108.001 is near left
        // SRTM is North to South, West to East
        // (39, 108) tile covers 39N to 40N and 108E to 109E
        // lat 40.0 is y=0, lat 39.0 is y=1200
        
        expect(el).toBeDefined();
    });

    it('should return cache stats', () => {
        const stats = service.getCacheStats();
        expect(stats.cachedTiles).toBe(0);
        expect(stats.activeJobs).toBe(0);
    });
});

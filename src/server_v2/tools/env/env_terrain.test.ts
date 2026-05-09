import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env_sample_terrain } from './env_sample_terrain.js';
import { env_prefetch_terrain } from './env_prefetch_terrain.js';
import { env_get_cache_stats } from './env_get_cache_stats.js';
import { createMockMatchService, createMockContext } from '../../test_utils/mock_factory.js';

describe('Terrain Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('env_sample_terrain', () => {
        it('should return elevation for a coordinate', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);

            vi.spyOn(ctx.app.terrainService, 'getElevation').mockResolvedValue(450);

            const result = await env_sample_terrain.call({
                matchId: 'm1',
                position: { x: 39, y: 108, z: 0 }
            }, ctx);

            expect(result.elevationM).toBe(450);
            expect(result.terrainType).toBe('Land');
            expect(ctx.app.terrainService.getElevation).toHaveBeenCalledWith(39, 108);
        });
    });

    describe('env_prefetch_terrain', () => {
        it('should queue tiles for prefetching', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);

            const result = await env_prefetch_terrain.call({
                matchId: 'm1',
                latMin: 39,
                latMax: 40,
                lonMin: 108,
                lonMax: 109
            }, ctx);

            // (40-39+1) * (109-108+1) = 2*2 = 4 tiles
            expect(result.queuedCount).toBe(4);
            expect(ctx.app.terrainService.getTile).toHaveBeenCalledTimes(4);
        });
    });

    describe('env_get_cache_stats', () => {
        it('should return cache and worker stats', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);

            vi.spyOn(ctx.app.terrainService, 'getCacheStats').mockReturnValue({
                cachedTiles: 5,
                activeJobs: 1,
                queuedJobs: 2
            } as any);

            const result = await env_get_cache_stats.call({}, ctx);

            expect(result.cachedTiles).toBe(5);
            expect(result.activeJobs).toBe(1);
        });
    });
});

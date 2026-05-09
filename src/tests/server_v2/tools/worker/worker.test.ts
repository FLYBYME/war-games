import { describe, it, expect, vi, beforeEach } from 'vitest';
import { worker_list } from './worker_list.js';
import { worker_get_stats } from './worker_get_stats.js';
import { createMockMatchService, createMockContext } from '../../test_utils/mock_factory.js';

describe('Worker Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('worker_list', () => {
        it('should list active worker pools', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);

            // Mock listPools to return something
            vi.spyOn(ctx.app.workerService, 'listPools').mockReturnValue([
                { poolName: 'terrain', workerCount: 4, activeJobs: 0, queuedJobs: 0, workers: [] }
            ]);

            const result = await worker_list.call({}, ctx);

            expect(result.pools).toHaveLength(1);
            expect(result.pools[0].poolName).toBe('terrain');
        });
    });

    describe('worker_get_stats', () => {
        it('should return stats for a specific pool', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);

            const mockPool = {
                getStats: vi.fn(() => ({ poolName: 'terrain', workerCount: 4, activeJobs: 1, queuedJobs: 2, workers: [] }))
            };
            vi.spyOn(ctx.app.workerService, 'getPool').mockReturnValue(mockPool as any);

            const result = await worker_get_stats.call({ poolName: 'terrain' }, ctx);

            expect(result.poolName).toBe('terrain');
            expect(result.activeJobs).toBe(1);
            expect(result.queuedJobs).toBe(2);
        });
    });
});

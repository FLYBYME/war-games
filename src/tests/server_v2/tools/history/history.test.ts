import { describe, it, expect, vi, beforeEach } from 'vitest';
import { history_get_losses } from '../../../../server_v2/tools/history/history_get_losses.js';
import { history_aggregate_metrics } from '../../../../server_v2/tools/history/history_aggregate_metrics.js';
import { createMockMatchService, createMockContext } from '../../utils/mock_factory.js';

// Mock queryParquet
vi.mock('../../../../server_v2/db/duckdb.js', () => ({
    queryParquet: vi.fn(async () => [
        { side: 'Blue', entityId: 'b1', destroyedAtTick: 100 },
        { side: 'Red', entityId: 'r1', destroyedAtTick: 200 }
    ])
}));

describe('History Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('history_get_losses', () => {
        it('should return aggregated loss data from DuckDB results', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);

            const result = await history_get_losses.call({
                batchId: 'batch-1'
            }, ctx);

            expect(result.blueLosses).toBe(1);
            expect(result.redLosses).toBe(1);
            expect(result.breakdown).toHaveLength(2);
        });
    });

    describe('history_aggregate_metrics', () => {
        it('should return placeholder statistical KPIs', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);

            const result = await history_aggregate_metrics.call({
                batchId: 'batch-1',
                metric: 'pk'
            }, ctx);

            expect(result.metric).toBe('pk');
            expect(result.mean).toBeDefined();
        });
    });
});

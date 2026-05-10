import { describe, it, expect, vi, beforeEach } from 'vitest';
import { history_get_losses } from '../../../../server_v2/tools/history/history_get_losses.js';
import { history_aggregate_metrics } from '../../../../server_v2/tools/history/history_aggregate_metrics.js';
import { history_get_entity_samples } from '../../../../server_v2/tools/history/history_get_entity_samples.js';
import { createMockMatchService, createMockContext, createMockMatchHandle } from '../../utils/mock_factory.js';

// Mock the MatchService module to override isMatchHandle
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

// Mock queryParquet
vi.mock('../../../../server_v2/db/duckdb.js', () => ({
    queryParquet: vi.fn(async (_batchId, table) => {
        if (table === 'events') {
            return [
                { type: 'EntityDestroyed', side: 'Blue', entityId: 'b1', destroyedAtTick: 100 },
                { type: 'EntityDestroyed', side: 'Red', entityId: 'r1', destroyedAtTick: 200 }
            ];
        }
        return [
            { tick: 1, x: 100, y: 100, z: 0, speedKts: 30, heading: 90, hp: 100, isDestroyed: false, fuelPct: 1, missionType: 'Patrol', missionStatus: 'Active' },
            { tick: 2, x: 200, y: 100, z: 0, speedKts: 30, heading: 90, hp: 100, isDestroyed: false, fuelPct: 1, missionType: 'Patrol', missionStatus: 'Active' }
        ];
    })
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

    describe('history_get_entity_samples', () => {
        it('should return samples from live match if active', async () => {
            const handle = createMockMatchHandle();
            const { TelemetrySystem } = await import('../../../../engine/systems/TelemetrySystem.js');
            
            // Mock TelemetrySystem
            const mockTelemetry = {
                getEntityHistory: vi.fn(() => [
                    { tick: 1, pos: { x: 0, y: 0, z: 0 }, hp: 100 },
                    { tick: 2, pos: { x: 10, y: 0, z: 0 }, hp: 100 }
                ])
            };
            (handle.world.getSystem as any).mockImplementation((ctor: any) => {
                if (ctor.name === 'TelemetrySystem') return mockTelemetry;
                return undefined;
            });

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await history_get_entity_samples.call({
                batchId: handle.id,
                entityId: 'e1',
                sampleCount: 10
            }, ctx);

            expect(result.totalCount).toBe(2);
            expect(result.samples[1].position.x).toBe(10);
            expect(mockTelemetry.getEntityHistory).toHaveBeenCalled();
        });

        it('should fall back to DuckDB if match is not active', async () => {
            const { isMatchHandle } = await import('../../../../server_v2/services/MatchService.js');
            (isMatchHandle as any).mockReturnValueOnce(false);

            const matchService = createMockMatchService([]); // No matches
            const ctx = createMockContext(matchService);

            const result = await history_get_entity_samples.call({
                batchId: 'archived-match',
                entityId: 'e1',
                sampleCount: 10
            }, ctx);

            expect(result.totalCount).toBe(2);
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { datalink_get } from '../../../../server_v2/tools/datalink/datalink_get.js';
import { datalink_update_network } from '../../../../server_v2/tools/datalink/datalink_update_network.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { DatalinkComponent } from '../../../../engine/components/Datalink.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Datalink Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('datalink_get', () => {
        it('should return datalink state of an entity', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const datalink = new DatalinkComponent({ networkId: 'NET-1', isActive: true, latencyTicks: 3 });
            entity.getComponent = vi.fn(() => datalink);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await datalink_get.call({ matchId: handle.id, entityId: 'e1' }, ctx);

            expect(result.networkId).toBe('NET-1');
            expect(result.latencyMs).toBe(300);
        });
    });

    describe('datalink_update_network', () => {
        it('should update network membership', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const datalink = new DatalinkComponent();
            entity.getComponent = vi.fn(() => datalink);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await datalink_update_network.call({
                matchId: handle.id,
                entityId: 'e1',
                networkId: 'NEW-NET'
            }, ctx);

            expect(datalink.networkId).toBe('NEW-NET');
            expect(result.networkId).toBe('NEW-NET');
        });
    });
});

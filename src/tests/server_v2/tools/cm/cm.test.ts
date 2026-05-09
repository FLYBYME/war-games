import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cm_deploy } from '../../../../server_v2/tools/cm/cm_deploy.js';
import { cm_get_inventory } from '../../../../server_v2/tools/cm/cm_get_inventory.js';
import { createMockMatchHandle, createMockMatchService, createMockContext } from '../../utils/mock_factory.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Countermeasure Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('cm_deploy', () => {
        it('should return success for deployment placeholder', async () => {
            const handle = createMockMatchHandle();
            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await cm_deploy.call({
                matchId: handle.id,
                entityId: 'e1',
                type: 'Chaff',
                quantity: 1
            }, ctx);

            expect(result.success).toBe(true);
            expect(result.remaining).toBeGreaterThan(0);
        });
    });

    describe('cm_get_inventory', () => {
        it('should return placeholder CM inventory', async () => {
            const handle = createMockMatchHandle();
            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await cm_get_inventory.call({
                matchId: handle.id,
                entityId: 'e1'
            }, ctx);

            expect(result.inventory).toHaveLength(2);
            expect(result.inventory[0].type).toBe('Chaff');
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { side_get_roe } from '../../../../server_v2/tools/side/side_get_roe.js';
import { side_update_roe } from '../../../../server_v2/tools/side/side_update_roe.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { DoctrineComponent } from '../../../../engine/components/Doctrine.js';
import { SetIntentCommand } from '../../../../engine/core/Command.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Side Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('side_get_roe', () => {
        it('should return side doctrine via entity proxy', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1', 'Blue');
            const doctrine = new DoctrineComponent({ roe: 'Free' as any, emcon: 'Alpha' as any });
            entity.getComponent = vi.fn(() => doctrine);
            
            (handle as any).world.getEntities = vi.fn(() => [entity]);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await side_get_roe.call({ matchId: handle.id, side: 'Blue' as any }, ctx);

            expect(result.roe).toBe('Free');
            expect(result.emcon).toBe('Alpha');
        });
    });

    describe('side_update_roe', () => {
        it('should queue SetIntentCommand for side-wide update', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await side_update_roe.call({
                matchId: handle.id,
                side: 'Blue' as any,
                roe: 'Tight',
                emcon: 'Silent'
            }, ctx);

            expect(result.roe).toBe('Tight');
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(SetIntentCommand));
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { guidance_get } from '../../../../server_v2/tools/guidance/guidance_get.js';
import { guidance_update } from '../../../../server_v2/tools/guidance/guidance_update.js';
import { guidance_set_target } from '../../../../server_v2/tools/guidance/guidance_set_target.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { GuidanceComponent, GuidanceType } from '../../../../engine/components/Guidance.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Guidance Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('guidance_get', () => {
        it('should return guidance state of a weapon', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('w1');
            const guidance = new GuidanceComponent({ 
                guidanceType: GuidanceType.ARH,
                targetId: 't1',
                hasLock: true,
                maneuverabilityG: 45
            });
            entity.getComponent = vi.fn(() => guidance);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await guidance_get.call({ matchId: handle.id, entityId: 'w1' }, ctx);

            expect(result.guidanceType).toBe(GuidanceType.ARH);
            expect(result.targetId).toBe('t1');
            expect(result.hasLock).toBe(true);
            expect(result.maneuverabilityG).toBe(45);
        });
    });

    describe('guidance_update', () => {
        it('should update seeker parameters', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('w1');
            const guidance = new GuidanceComponent();
            entity.getComponent = vi.fn(() => guidance);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await guidance_update.call({
                matchId: handle.id,
                entityId: 'w1',
                maneuverabilityG: 60,
                guidanceType: 'IR' as any
            }, ctx);

            expect(guidance.maneuverabilityG).toBe(60);
            expect(guidance.guidanceType).toBe('IR');
            expect(result.maneuverabilityG).toBe(60);
        });
    });

    describe('guidance_set_target', () => {
        it('should update seeker targetId', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('w1');
            const guidance = new GuidanceComponent();
            entity.getComponent = vi.fn(() => guidance);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await guidance_set_target.call({
                matchId: handle.id,
                entityId: 'w1',
                targetId: 'new-target'
            }, ctx);

            expect(guidance.targetId).toBe('new-target');
            expect(result.success).toBe(true);
        });
    });
});

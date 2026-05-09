import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signature_get } from '../../../../server_v2/tools/signature/signature_get.js';
import { signature_update } from '../../../../server_v2/tools/signature/signature_update.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { RCSComponent } from '../../../../engine/components/Signatures.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Signature Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('signature_get', () => {
        it('should return signature state of an entity', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const rcs = new RCSComponent({ baseRCS: 0.1, frontalMultiplier: 0.5 });
            entity.getComponent = vi.fn(() => rcs);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await signature_get.call({ matchId: handle.id, entityId: 'e1' }, ctx);

            expect(result.baseRCS).toBe(0.1);
            expect(result.frontalMultiplier).toBe(0.5);
            expect(result.bandMultipliers).toHaveLength(4);
        });
    });

    describe('signature_update', () => {
        it('should update signature state', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const rcs = new RCSComponent();
            entity.getComponent = vi.fn(() => rcs);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await signature_update.call({
                matchId: handle.id,
                entityId: 'e1',
                baseRCS: 0.05
            }, ctx);

            expect(rcs.baseRCS).toBe(0.05);
            expect(result.baseRCS).toBe(0.05);
        });
    });
});

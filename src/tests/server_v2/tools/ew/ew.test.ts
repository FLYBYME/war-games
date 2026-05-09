import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ew_get_jammer } from '../../../../server_v2/tools/ew/ew_get_jammer.js';
import { ew_set_jammer_state } from '../../../../server_v2/tools/ew/ew_set_jammer_state.js';
import { ew_assign_jammer_target } from '../../../../server_v2/tools/ew/ew_assign_jammer_target.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { JammerComponent, JammerMode, JammerType } from '../../../../engine/components/ElectronicWarfare.js';
import { EMBand } from '../../../../engine/core/Types.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Electronic Warfare Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('ew_get_jammer', () => {
        it('should return jammer state and map band correctly', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const jammer = new JammerComponent({ 
                frequencyHz: 10e9, // X-band
                powerWatts: 5000,
                isActive: true 
            });
            entity.getComponent = vi.fn(() => jammer);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await ew_get_jammer.call({ matchId: handle.id, entityId: 'e1' }, ctx);

            expect(result.band).toBe(EMBand.X);
            expect(result.powerKw).toBe(5);
            expect(result.isActive).toBe(true);
        });
    });

    describe('ew_set_jammer_state', () => {
        it('should update jammer parameters', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const jammer = new JammerComponent();
            entity.getComponent = vi.fn(() => jammer);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await ew_set_jammer_state.call({
                matchId: handle.id,
                entityId: 'e1',
                isActive: true,
                powerKw: 10,
                mode: 'Deceptive' as any
            }, ctx);

            expect(jammer.isActive).toBe(true);
            expect(jammer.powerWatts).toBe(10000);
            expect(jammer.mode).toBe(JammerMode.Deceptive);
        });
    });

    describe('ew_assign_jammer_target', () => {
        it('should update jammer targetId', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const jammer = new JammerComponent();
            entity.getComponent = vi.fn(() => jammer);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            await ew_assign_jammer_target.call({
                matchId: handle.id,
                entityId: 'e1',
                targetId: 't1'
            }, ctx);

            expect(jammer.targetId).toBe('t1');
        });
    });
});

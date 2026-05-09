import { describe, it, expect, vi, beforeEach } from 'vitest';
import { propulsion_get } from '../../../../server_v2/tools/propulsion/propulsion_get.js';
import { propulsion_update } from '../../../../server_v2/tools/propulsion/propulsion_update.js';
import { propulsion_set_state } from '../../../../server_v2/tools/propulsion/propulsion_set_state.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { PropulsionComponent } from '../../../../engine/components/Propulsion.js';
import { SetThrottleCommand } from '../../../../engine/core/Command.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Propulsion Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('propulsion_get', () => {
        it('should return propulsion state of an entity', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const prop = new PropulsionComponent({ throttle: 0.8, state: 'Dry' as any });
            entity.getComponent = vi.fn(() => prop);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await propulsion_get.call({ matchId: handle.id, entityId: 'e1' }, ctx);

            expect(result.throttle).toBe(0.8);
            expect(result.engineState).toBe('Dry');
        });
    });

    describe('propulsion_update', () => {
        it('should queue SetThrottleCommand', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            (handle as any).world.getEntity = vi.fn(() => entity);
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await propulsion_update.call({
                matchId: handle.id,
                entityId: 'e1',
                throttle: 0.5
            }, ctx);

            expect(result.throttle).toBe(0.5);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(SetThrottleCommand));
        });
    });

    describe('propulsion_set_state', () => {
        it('should map engine state to throttle', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const prop = new PropulsionComponent();
            entity.getComponent = vi.fn(() => prop);
            (handle as any).world.getEntity = vi.fn(() => entity);
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await propulsion_set_state.call({
                matchId: handle.id,
                entityId: 'e1',
                state: 'Afterburner'
            }, ctx);

            expect(result.throttle).toBe(1.0);
            expect(result.engineState).toBe('Afterburner');
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(SetThrottleCommand));
        });
    });
});

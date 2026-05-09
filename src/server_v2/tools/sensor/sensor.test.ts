import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sensor_list } from './sensor_list.js';
import { sensor_update } from './sensor_update.js';
import { sensor_set_emcon } from './sensor_set_emcon.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../test_utils/mock_factory.js';
import { SensorComponent } from '../../../engine/components/Sensors.js';
import { SetEMCONCommand } from '../../../engine/core/Command.js';
import { EMCONState } from '../../../engine/core/Types.js';

// Mock MatchService
vi.mock('../../services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Sensor Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('sensor_list', () => {
        it('should list all sensors on an entity', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const s1 = new SensorComponent({ name: 'Radar Alpha', isActive: true });
            const s2 = new SensorComponent({ name: 'Sonar Beta', isActive: false });
            
            // Note: mock_factory's createMockEntity uses addComponent to store in a Map by ctor.name
            // But SensorComponent.type is 'SensorComponent', same for all instances.
            // Our tool uses getComponents(SensorComponent) which we need to mock if it's not standard ECS.
            // Actually, the tool implementation I read used: const sensorComponents = entity.getComponents(SensorComponent);
            
            entity.getComponents = vi.fn(() => [s1, s2]);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await sensor_list.call({ matchId: handle.id, entityId: 'e1' }, ctx);

            expect(result.sensors).toHaveLength(2);
            expect(result.sensors[0].name).toBe('Radar Alpha');
            expect(result.sensors[1].isActive).toBe(false);
        });
    });

    describe('sensor_update', () => {
        it('should toggle sensor power', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const s1 = new SensorComponent({ name: 'Radar', isActive: true });
            
            entity.getComponents = vi.fn(() => [s1]);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await sensor_update.call({
                matchId: handle.id,
                entityId: 'e1',
                index: 0,
                isActive: false
            }, ctx);

            expect(s1.isActive).toBe(false);
            expect(result.isActive).toBe(false);
        });
    });

    describe('sensor_set_emcon', () => {
        it('should queue SetEMCONCommand', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            await sensor_set_emcon.call({
                matchId: handle.id,
                entityId: 'e1',
                state: EMCONState.Silent
            }, ctx);

            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(SetEMCONCommand));
        });
    });
});

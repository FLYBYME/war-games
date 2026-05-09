import { describe, it, expect, vi, beforeEach } from 'vitest';
import { kinematics_get } from './kinematics_get.js';
import { kinematics_update } from './kinematics_update.js';
import { kinematics_set_position } from './kinematics_set_position.js';
import { kinematics_apply_force } from './kinematics_apply_force.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../test_utils/mock_factory.js';
import { TransformComponent, KinematicsComponent } from '../../../engine/components/Physics.js';
import { SetPositionCommand, SetSpeedCommand, ApplyForceCommand } from '../../../engine/core/Command.js';

// Mock MatchService
vi.mock('../../services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Kinematics Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('kinematics_get', () => {
        it('should return physical state of an entity', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            entity.addComponent(new TransformComponent({ 
                position: { x: 100, y: 200, z: 300 },
                heading: 90
            }));
            entity.addComponent(new KinematicsComponent({
                velocity: { x: 10, y: 0, z: 0 }
            }));
            
            (handle as any).world.getEntity = vi.fn(() => entity);
            (handle as any).world.getSystem = vi.fn(() => undefined); // No environment system for LLA check

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await kinematics_get.call({ matchId: handle.id, entityId: 'e1' }, ctx);

            expect(result.position.x).toBe(100);
            expect(result.heading).toBe(90);
            expect(result.velocity.x).toBe(10);
        });
    });

    describe('kinematics_update', () => {
        it('should queue external commands for speed/heading/altitude', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();
            const entity = createMockEntity('e1');
            entity.addComponent(new TransformComponent({ position: { x: 0, y: 0, z: 0 } }));
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await kinematics_update.call({
                matchId: handle.id,
                entityId: 'e1',
                speedKts: 500,
                heading: 180
            }, ctx);

            expect(result.position).toBeDefined();
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledTimes(2);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(SetSpeedCommand));
        });
    });

    describe('kinematics_set_position', () => {
        it('should queue teleport command', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();
            const entity = createMockEntity('e1');
            entity.addComponent(new TransformComponent({ position: { x: 0, y: 0, z: 0 } }));
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await kinematics_set_position.call({
                matchId: handle.id,
                entityId: 'e1',
                position: { x: 1000, y: 1000, z: 1000 }
            }, ctx);

            expect(result.position).toBeDefined();
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(SetPositionCommand));
        });
    });

    describe('kinematics_apply_force', () => {
        it('should queue apply force command', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();
            const entity = createMockEntity('e1');
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await kinematics_apply_force.call({
                matchId: handle.id,
                entityId: 'e1',
                force: { x: 0, y: 0, z: 9.8 }
            }, ctx);

            expect(result.success).toBe(true);
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(ApplyForceCommand));
        });
    });
});

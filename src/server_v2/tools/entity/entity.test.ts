import { describe, it, expect, vi, beforeEach } from 'vitest';
import { entity_list } from './entity_list.js';
import { entity_create } from './entity_create.js';
import { entity_get } from './entity_get.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../test_utils/mock_factory.js';
import { TransformComponent } from '../../../engine/components/Physics.js';
import { HealthComponent } from '../../../engine/components/Health.js';
import { Side } from '../../../engine/core/Types.js';

// Mock the MatchService module to override isMatchHandle
vi.mock('../../services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Entity Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('entity_list', () => {
        it('should list all entities in a match', async () => {
            const handle = createMockMatchHandle();
            const e1 = createMockEntity('e1', Side.Blue);
            e1.addComponent(new TransformComponent({ position: { x: 100, y: 200, z: 0 } }));
            e1.addComponent(new HealthComponent({ hp: 100 }));
            
            const e2 = createMockEntity('e2', Side.Red);
            e2.addComponent(new TransformComponent({ position: { x: -500, y: 0, z: 1000 } }));
            
            (handle as any).world.addEntity(e1);
            (handle as any).world.addEntity(e2);
            
            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await entity_list.call({ matchId: handle.id }, ctx);

            expect(result.totalCount).toBe(2);
            expect(result.entities[0].id).toBe('e1');
            expect(result.entities[0].position.x).toBe(100);
            expect(result.entities[1].id).toBe('e2');
            expect(result.entities[1].side).toBe(Side.Red);
        });

        it('should filter entities by side', async () => {
            const handle = createMockMatchHandle();
            const e1 = createMockEntity('e1', Side.Blue);
            const e2 = createMockEntity('e2', Side.Red);
            
            (handle as any).world.addEntity(e1);
            (handle as any).world.addEntity(e2);
            
            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await entity_list.call({ matchId: handle.id, side: Side.Blue }, ctx);

            expect(result.totalCount).toBe(1);
            expect(result.entities[0].id).toBe('e1');
        });
    });

    describe('entity_create', () => {
        it('should spawn a new entity', async () => {
            const handle = createMockMatchHandle();
            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await entity_create.call({
                matchId: handle.id,
                profileId: 'f16-profile',
                side: Side.Blue,
                position: { x: 1000, y: 1000, z: 5000 },
                heading: 90
            }, ctx);

            expect(result.side).toBe(Side.Blue);
            expect(result.position.x).toBe(1000);
            expect(result.heading).toBe(90);
            expect((handle as any).world.addEntity).toHaveBeenCalled();
        });
    });

    describe('entity_get', () => {
        it('should return details for a specific entity', async () => {
            const handle = createMockMatchHandle();
            const e1 = createMockEntity('e1', Side.Blue);
            e1.addComponent(new TransformComponent({ position: { x: 100, y: 200, z: 0 }, rotation: 45 }));
            
            (handle as any).world.addEntity(e1);
            
            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await entity_get.call({ matchId: handle.id, entityId: 'e1' }, ctx);

            expect(result.id).toBe('e1');
            expect(result.position.x).toBe(100);
            expect(result.heading).toBe(45);
        });

        it('should throw error if entity is not found', async () => {
            const handle = createMockMatchHandle();
            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            await expect(entity_get.call({ matchId: handle.id, entityId: 'missing' }, ctx))
                .rejects.toThrow('Entity not found');
        });
    });
});

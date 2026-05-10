import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../engine/core/World';
import { ProfileRegistry } from '../../engine/core/ProfileRegistry';
import { WeaponProfileRegistry } from '../../engine/core/WeaponProfileRegistry';
import { Entity } from '../../engine/core/Entity';
import { TransformComponent, KinematicsComponent } from '../../engine/components/Physics';
import { Side, GuidanceType } from '../../engine/core/Types';
import { bootstrapComponents } from '../../engine/core/ComponentBootstrap';

describe('Persistence & Registry Unit Tests (Tests 241-260)', () => {
    let world: World;

    beforeEach(() => {
        bootstrapComponents();
        world = new World();
    });

    it('should register and retrieve entity profiles (Test 241)', () => {
        const registry = new ProfileRegistry();
        const profile = {
            platformClass: 'F-16 Fighting Falcon',
            type: 'Aircraft' as any,
            kinematics: {
                maxSpeedKts: 1200,
                massEmptyKg: 9000
            },
            combat: {
                mounts: []
            }
        };

        registry.register('f-16', profile as any);
        expect(registry.get('f-16')).toEqual(profile);
        expect(registry.list()).toHaveLength(1);
    });

    it('should register and retrieve weapon profiles (Test 242)', () => {
        const registry = new WeaponProfileRegistry();
        const profile = {
            id: 'aim-9x',
            name: 'AIM-9X Sidewinder',
            type: 'Missile' as any,
            maxRangeM: 20000,
            minRangeM: 0,
            maxSpeedKts: 2500,
            cruiseSpeedKts: 2000,
            guidance: GuidanceType.Passive,
            pk: 0.8,
            warheadType: 'BlastFrag' as any,
            requiresIllumination: false
        };

        registry.register('aim-9x', profile);
        expect(registry.get('aim-9x')).toEqual(expect.objectContaining(profile));
    });

    it('should serialize and deserialize world state (Test 250)', async () => {
        const plane = new Entity('plane-1', Side.Blue);
        plane.addComponent(new TransformComponent({ position: { x: 100, y: 200, z: 300 } }));
        plane.addComponent(new KinematicsComponent({ velocity: { x: 10, y: 0, z: 0 }, massKg: 10000 }));
        world.addEntity(plane);
        world.currentTick = 555;

        // 1. Serialize
        const json = world.toJSON();
        expect(json.currentTick).toBe(555);
        expect(json.entities).toHaveLength(1);
        expect(json.entities[0].id).toBe('plane-1');

        // 2. Deserialize
        const newWorld = World.fromJSON(json);
        expect(newWorld.currentTick).toBe(555);
        
        const newPlane = newWorld.getEntity('plane-1')!;
        expect(newPlane).toBeDefined();
        expect(newPlane.side).toBe(Side.Blue);
        
        const transform = newPlane.getComponent(TransformComponent)!;
        expect(transform.position).toEqual({ x: 100, y: 200, z: 300 });
    });

    it('should maintain entity hierarchy during serialization (Test 251)', () => {
        const parent = new Entity('carrier', Side.Blue);
        const child = new Entity('plane', Side.Blue, 'carrier');
        world.addEntity(parent);
        world.addEntity(child);

        const json = world.toJSON();
        const newWorld = World.fromJSON(json);

        const newChild = newWorld.getEntity('plane')!;
        expect(newChild.parentEntityId).toBe('carrier');
    });
});

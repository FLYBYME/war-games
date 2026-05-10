import { describe, it, expect, vi, beforeEach } from 'vitest';
import { World } from '../../engine/core/World';
import { WeaponStageSystem } from '../../engine/systems/WeaponStageSystem';
import { CollisionSystem } from '../../engine/systems/CollisionSystem';
import { WeaponStageComponent } from '../../engine/components/WeaponStages';
import { FuelComponent, PropulsionComponent } from '../../engine/components/Propulsion';
import { GuidanceComponent, GuidanceType } from '../../engine/components/Guidance';
import { TransformComponent, KinematicsComponent } from '../../engine/components/Physics';
import { CollisionComponent } from '../../engine/components/Collision';
import { Entity } from '../../engine/core/Entity';
import { Side } from '../../engine/core/Types';
import { DeterministicRandom } from '../../engine/math/DeterministicRandom';
import { Octree } from '../../engine/core/Octree';

describe('Weapons & Munitions Unit Tests (Tests 81-82, 95-98)', () => {
    let world: World;
    let stageSystem: WeaponStageSystem;
    let collisionSystem: CollisionSystem;
    let mockWorld: any;

    beforeEach(() => {
        world = new World();
        // @ts-ignore
        world.random = new DeterministicRandom(1234);
        stageSystem = new WeaponStageSystem();
        collisionSystem = new CollisionSystem(world.grid);
        // @ts-ignore
        mockWorld = {
            currentTick: 0,
            getEntities: vi.fn().mockReturnValue([]),
            getEntity: vi.fn(),
            profileRegistry: {
                get: vi.fn()
            },
            events: {
                emit: vi.fn()
            },
            random: world.random
        };
    });

    it('should advance weapon stages and change thrust (Test 95)', async () => {
        const weapon = new Entity('missile', Side.Blue);
        const stages = [
            { name: 'Booster', durationTicks: 10, thrustN: 50000, separateOnComplete: true },
            { name: 'Sustainer', durationTicks: 50, thrustN: 10000, separateOnComplete: false }
        ];
        weapon.addComponent(new WeaponStageComponent(stages));
        weapon.addComponent(new PropulsionComponent({ maxThrustDryN: 50000 }));
        world.addEntity(weapon);

        // Tick 1
        let commands = await stageSystem.process(world, 0.1);
        expect(commands.find(c => c.constructor.name === 'UpdateThrustCommand')).toBeDefined();
        world.resolveCommands(commands);
        expect(weapon.getComponent(WeaponStageComponent)!.currentStageElapsedTicks).toBe(1);

        // Fast forward to end of stage 1
        weapon.getComponent(WeaponStageComponent)!.currentStageElapsedTicks = 9;
        commands = await stageSystem.process(world, 0.1);
        const nextStageCmd = commands.find(c => c.constructor.name === 'NextWeaponStageCommand');
        expect(nextStageCmd).toBeDefined();
        
        world.resolveCommands(commands);
        expect(weapon.getComponent(WeaponStageComponent)!.currentStageIndex).toBe(1);
        expect(weapon.getComponent(WeaponStageComponent)!.stages[1].name).toBe('Sustainer');
    });

    it('should self-destruct when fuel is out and lock is lost (Test 98)', async () => {
        const weapon = new Entity('missile', Side.Blue);
        weapon.addComponent(new FuelComponent({ maxKg: 100, currentKg: 0 }));
        weapon.addComponent(new GuidanceComponent({ guidanceType: GuidanceType.ARH, targetId: 'none' }));
        const guidance = weapon.getComponent(GuidanceComponent)!;
        guidance.lastLockTick = 0;
        
        world.addEntity(weapon);
        world.currentTick = 500; // Long after lock lost

        const commands = await stageSystem.process(world, 0.1);
        expect(commands.find(c => c.constructor.name === 'DestroyEntityCommand')).toBeDefined();
    });

    it('should use proximity fuse for missiles against aircraft (Test 96)', async () => {
        const missile = new Entity('aim-120', Side.Blue);
        missile.addComponent(new TransformComponent({ position: { x: 0, y: 0, z: 1000 } }));
        missile.addComponent(new CollisionComponent({ radiusMeters: 1, layer: 'missile', collidesWith: ['air'] }));
        // High speed for CCD
        missile.addComponent(new KinematicsComponent({ velocity: { x: 1000, y: 0, z: 0 }, massKg: 150, dragCoeff: 0.02, thrustN: 0 }));

        const target = new Entity('f-35', Side.Red);
        target.addComponent(new TransformComponent({ position: { x: 10, y: 0, z: 1000 } })); // 10m away
        target.addComponent(new CollisionComponent({ radiusMeters: 5, layer: 'air', collidesWith: ['missile'] }));
        // Mock profile registry for aircraft type
        world.profileRegistry.register('f-35-profile', { type: 'Aircraft' });
        target.profileId = 'f-35-profile';

        world.addEntity(missile);
        world.addEntity(target);
        world.grid.updateEntity('f-35', target.getComponent(TransformComponent)!.position);

        const commands = await collisionSystem.process(world, 0.1);
        const damageCmd = commands.find(c => c.constructor.name === 'ApplyDamageCommand') as any;
        
        // Target is 10m away. Radius is 1+5=6m. Without proximity fuse (15m), it would MISS.
        // With proximity fuse, it should HIT.
        expect(damageCmd).toBeDefined();
        expect(damageCmd.entityId).toBe('f-35');
    });

    it('should require direct hit for contact fuse weapons (Test 97)', async () => {
        const shell = new Entity('76mm', Side.Blue);
        shell.addComponent(new TransformComponent({ position: { x: 0, y: 0, z: 0 } }));
        shell.addComponent(new CollisionComponent({ radiusMeters: 0.1, layer: 'default', collidesWith: ['surface'] }));
        shell.addComponent(new KinematicsComponent({ velocity: { x: 1000, y: 0, z: 0 }, massKg: 6, dragCoeff: 0.1, thrustN: 0 }));

        const target = new Entity('tank', Side.Red);
        target.addComponent(new TransformComponent({ position: { x: 10, y: 0, z: 0 } })); // 10m away
        target.addComponent(new CollisionComponent({ radiusMeters: 2, layer: 'surface', collidesWith: ['default'] }));
        world.profileRegistry.register('tank-profile', { type: 'Facility' }); // Facility uses contact fuse
        target.profileId = 'tank-profile';

        world.addEntity(shell);
        world.addEntity(target);
        world.grid.updateEntity('tank', target.getComponent(TransformComponent)!.position);

        const commands = await collisionSystem.process(world, 0.1);
        const damageCmd = commands.find(c => c.constructor.name === 'ApplyDamageCommand');
        
        // 10m > (0.1 + 2). Should MISS.
        expect(damageCmd).toBeUndefined();
    });

    it('should lose guidance lock on sensor loss (Semi-Active) (Test 82)', async () => {
        const guidanceSystem = new (await import('../../engine/systems/GuidanceSystem')).GuidanceSystem();
        const missile = new Entity('aim-7', Side.Blue);
        const guidance = new GuidanceComponent({ guidanceType: GuidanceType.SARH, targetId: 'tgt', illuminatorId: 'ship' });
        missile.addComponent(guidance);

        const ship = new Entity('ship', Side.Blue);
        const sensor = new (await import('../../engine/components/Sensors')).SensorComponent({ 
            mode: (await import('../../engine/core/Types')).SensorMode.Illumination,
            illuminatedTargetId: 'tgt',
            isActive: false // Sensor is OFF
        });
        ship.addComponent(sensor);
        ship.addComponent(new (await import('../../engine/components/Sensors')).DetectionComponent());

        mockWorld.getEntities.mockReturnValue([missile, ship]);
        mockWorld.getEntity.mockImplementation((id: string) => id === 'ship' ? ship : undefined);

        await guidanceSystem.process(mockWorld, 0.1);
        expect(guidance.hasLock).toBe(false);
    });

    it('should exhaust weapon duration/battery (Test 93)', async () => {
        const weapon = new Entity('aim-9', Side.Blue);
        const stages = [{ name: 'Rocket', durationTicks: 50, thrustN: 10000, separateOnComplete: false }];
        weapon.addComponent(new WeaponStageComponent(stages));
        world.addEntity(weapon);

        // Fast forward past duration
        weapon.getComponent(WeaponStageComponent)!.currentStageElapsedTicks = 50;
        
        const commands = await stageSystem.process(world, 0.1);
        const thrustCmd = commands.find(c => c.constructor.name === 'UpdateThrustCommand') as any;
        expect(thrustCmd).toBeDefined();
        expect(thrustCmd.thrustN).toBe(0); // Thrust exhausted
    });

    it('should respect weapon agility (Max-G) limits (Test 94)', async () => {
        const physicsSystem = new (await import('../../engine/systems/PhysicsSystem')).PhysicsSystem();
        const missile = new Entity('aim-120', Side.Blue);
        missile.addComponent(new TransformComponent({ position: { x: 0, y: 0, z: 0 } }));
        // High speed (Mach 2)
        missile.addComponent(new KinematicsComponent({ velocity: { x: 700, y: 0, z: 0 }, massKg: 150, dragCoeff: 0.02, thrustN: 0 }));
        
        // Massive sideways force (e.g. 100G)
        const mass = 150;
        const force100G = mass * 9.81 * 100;
        missile.getComponent(KinematicsComponent)!.netForce = { x: 0, y: force100G, z: 0 };

        mockWorld.getEntities.mockReturnValue([missile]);
        mockWorld.profileRegistry.get.mockReturnValue({ type: 'Weapon' });

        const commands = await physicsSystem.process(mockWorld, 0.1);
        const kinCmd = commands.find(c => c.constructor.name === 'UpdateKinematicsCommand') as any;
        
        // Max acceleration in PhysicsSystem is 50G
        const maxAccel = 50 * 9.81;
        const accelMag = Math.sqrt(kinCmd.acceleration.x ** 2 + kinCmd.acceleration.y ** 2 + kinCmd.acceleration.z ** 2);
        expect(accelMag).toBeLessThanOrEqual(maxAccel + 1); // Allow small floating point error
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { World } from '../../engine/core/World';
import { MissionSystem } from '../../engine/systems/MissionSystem';
import { TaskReconcilerSystem } from '../../engine/systems/TaskReconcilerSystem';
import { MissionComponent, MissionStatus } from '../../engine/components/Missions';
import { TaskGraphComponent } from '../../engine/components/TaskGraph';
import { isNavigateTask } from '../../engine/core/TaskGraph';
import { TransformComponent, KinematicsComponent } from '../../engine/components/Physics';
import { Entity } from '../../engine/core/Entity';
import { Side, MissionType, IdentificationStatus, TrackStatus, ROE } from '../../engine/core/Types';
import { DeterministicRandom } from '../../engine/math/DeterministicRandom';
import { TrackComponent } from '../../engine/components/Track';
import { DoctrineComponent } from '../../engine/components/Doctrine';
import { WRAExecutorSystem } from '../../engine/systems/WRAExecutorSystem';

describe('Missions & AI Tasks Unit Tests (Tests 141-160)', () => {
    let world: World;
    let missionSystem: MissionSystem;
    let taskSystem: TaskReconcilerSystem;

    beforeEach(() => {
        world = new World();
        world.random.setSeed(1234);
        missionSystem = new MissionSystem();
        taskSystem = new TaskReconcilerSystem();
    });

    const setupUnit = (id: string, side: Side, pos: { x: number, y: number, z: number }) => {
        const entity = new Entity(id, side);
        entity.addComponent(new TransformComponent({ position: pos }));
        entity.addComponent(new KinematicsComponent({ velocity: { x: 0, y: 0, z: 0 }, massKg: 10000 }));
        entity.addComponent(new TaskGraphComponent());
        world.addEntity(entity);
        return entity;
    };

    it('should generate orbit point for Patrol mission (Test 141)', async () => {
        const unit = setupUnit('plane', Side.Blue, { x: 0, y: 0, z: 1000 });
        const mission = new MissionComponent({
            missionType: MissionType.Patrol,
            params: { 
                center: { x: 5000, y: 5000, z: 1000 },
                radiusM: 5000,
                speedKts: 300,
                points: 4,
                altitudeM: 1000
            }
        });
        unit.addComponent(mission);

        await missionSystem.process(world, 0.1);
        
        const taskComp = unit.getComponent(TaskGraphComponent)!;
        const activeNode = Array.from(taskComp.graph.nodes.values())[0];
        
        expect(activeNode).toBeDefined();
        expect(activeNode.id).toContain('patrol-loiter');
        if (isNavigateTask(activeNode) && activeNode.task.payload.position) {
            expect(activeNode.task.payload.position).toBeDefined();
            // Should be near (5000, 5000)
            const dist = Math.sqrt(
                (activeNode.task.payload.position.x - 5000) ** 2 + 
                (activeNode.task.payload.position.y - 5000) ** 2
            );
            expect(dist).toBeLessThanOrEqual(5000);
        } else {
            throw new Error('Expected Navigate task with position');
        }
    });

    it('should switch to intercept during Patrol if hostile detected (Test 145)', async () => {
        const unit = setupUnit('plane', Side.Blue, { x: 0, y: 0, z: 1000 });
        const tracks = new TrackComponent();
        unit.addComponent(tracks);
        
        const mission = new MissionComponent({
            missionType: MissionType.Patrol,
            params: { 
                center: { x: 0, y: 0, z: 1000 },
                radiusM: 10000,
                speedKts: 300,
                points: 4,
                altitudeM: 1000
            }
        });
        unit.addComponent(mission);

        // Add hostile track
        tracks.tracks.set('H1', {
            id: 'H1', trueEntityId: 'hostile', position: { x: 2000, y: 2000, z: 1000 },
            velocity: { x: 0, y: 0, z: 0 }, cepM: 0, firstSeenTick: 0, lastSeenTick: 0,
            status: TrackStatus.Active, classification: 'Air-High', identification: IdentificationStatus.HOSTILE, confidence: 1.0
        });

        await missionSystem.process(world, 0.1);

        const taskComp = unit.getComponent(TaskGraphComponent)!;
        const activeNode = Array.from(taskComp.graph.nodes.values())[0];
        
        expect(activeNode.id).toContain('patrol-intercept');
        if (isNavigateTask(activeNode)) {
            expect(activeNode.task.payload.position).toEqual({ x: 2000, y: 2000, z: 1000 });
        } else {
            throw new Error('Expected Navigate task');
        }
    });

    it('should transition mission status to Active when started (Test 155)', async () => {
        const unit = setupUnit('plane', Side.Blue, { x: 0, y: 0, z: 1000 });
        const mission = new MissionComponent({
            missionType: MissionType.Patrol,
            params: { 
                center: { x: 0, y: 0, z: 0 },
                radiusM: 5000,
                speedKts: 300,
                points: 4,
                altitudeM: 1000
            }
        });
        unit.addComponent(mission);
        
        expect(mission.status).toBe(MissionStatus.Pending);
        
        await missionSystem.process(world, 0.1);
        
        expect(mission.status).toBe(MissionStatus.Active);
    });

    it('should respect Hold ROE (Test 160)', async () => {
        const wraExecutor = new WRAExecutorSystem(world.weaponProfiles);
        const shooter = setupUnit('ship', Side.Blue, { x: 0, y: 0, z: 0 });
        const doctrine = new DoctrineComponent();
        doctrine.roe = ROE.HOLD; // DO NOT FIRE
        shooter.addComponent(doctrine);
        
        // Add combat components
        shooter.addComponent(new (await import('../../engine/components/Combat')).CombatComponent({
            mounts: [{ name: 'Gun', magazineIndices: [0], activeMagazineIndex: 0, reloadTicks: 1, lastFireTick: -100, slewRate: 100, currentAzimuth: 0, currentElevation: 0, alignmentThresholdDeg: 1, minAzimuth: -180, maxAzimuth: 180, minElevation: -20, maxElevation: 85 }],
            magazines: [{ name: 'Ammo', weaponProfileId: 'gun', capacity: 100, currentCount: 100 }]
        }));
        
        const tracks = new TrackComponent();
        shooter.addComponent(tracks);
        tracks.tracks.set('T1', {
            id: 'T1', trueEntityId: 'hostile', position: { x: 1000, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 }, cepM: 0, firstSeenTick: 0, lastSeenTick: 0,
            status: TrackStatus.Active, classification: 'Surface', identification: IdentificationStatus.HOSTILE, confidence: 1.0
        });

        // Register weapon profile
        world.weaponProfiles.register('gun', { id: 'gun', name: 'Gun', type: 'Gun', maxRangeM: 5000, maxSpeedKts: 1000, cruiseSpeedKts: 1000, guidance: (await import('../../engine/core/Types')).GuidanceType.Ballistic });

        // @ts-ignore
        const mockWorld = {
            getEntities: vi.fn().mockReturnValue([shooter]),
            getEntity: vi.fn().mockImplementation((id: string) => id === 'hostile' ? { id } : undefined),
            currentTick: 0,
            random: world.random,
            profileRegistry: world.profileRegistry
        };

        const commands = await wraExecutor.process(mockWorld as any, 0.1);
        expect(commands.length).toBe(0); // Should not fire in HOLD ROE
    });
});

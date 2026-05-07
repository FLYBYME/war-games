import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackManagementSystem } from '../../engine/systems/TrackManagementSystem';
import { DatalinkSystem } from '../../engine/systems/DatalinkSystem';
import { TrackComponent } from '../../engine/components/TMS';
import { DetectionComponent } from '../../engine/components/Sensors';
import { TransformComponent, KinematicsComponent } from '../../engine/components/Physics';
import { CombatComponent } from '../../engine/components/Combat';
import { DatalinkComponent } from '../../engine/components/Datalink';
import { Entity } from '../../engine/core/Entity';
import { TrackStatus, IdentificationStatus, Side, Track } from '../../engine/core/Types';

describe('Tracking & Fusion Unit Tests', () => {
    let tms: TrackManagementSystem;
    let datalinkSystem: DatalinkSystem;
    let mockWorld: any;

    beforeEach(() => {
        tms = new TrackManagementSystem();
        datalinkSystem = new DatalinkSystem();
        mockWorld = {
            currentTick: 0,
            getEntities: vi.fn().mockReturnValue([]),
            getEntity: vi.fn(),
            profileRegistry: {
                get: vi.fn()
            },
            events: {
                emit: vi.fn()
            }
        };
    });

    const setupObserver = (id: string, side: Side) => {
        const obs = new Entity(id, side);
        obs.addComponent(new TrackComponent());
        obs.addComponent(new DetectionComponent());
        obs.addComponent(new TransformComponent());
        return obs;
    };

    describe('Track Lifecycle (Tests 41-42, 44-46, 52, 57)', () => {
        it('should generate a Pending identification for a new detection (Test 41)', async () => {
            const observer = setupObserver('obs', Side.Blue);
            const detection = observer.getComponent(DetectionComponent)!;
            detection.detectedEntityIds.add('tgt-1');

            const target = new Entity('tgt-1', Side.Red);
            target.addComponent(new TransformComponent({ x: 1000, y: 1000, z: 0 }));
            
            mockWorld.getEntities.mockReturnValue([observer]);
            mockWorld.getEntity.mockReturnValue(target);

            await tms.process(mockWorld, 0.1);

            const track = Array.from(observer.getComponent(TrackComponent)!.tracks.values())[0];
            expect(track).toBeDefined();
            expect(track.identification).toBe(IdentificationStatus.PENDING);
        });

        it('should promote track to Active only after three consecutive detections (Test 42)', async () => {
            const observer = setupObserver('obs', Side.Blue);
            const detection = observer.getComponent(DetectionComponent)!;
            detection.detectedEntityIds.add('tgt-1');

            const target = new Entity('tgt-1', Side.Red);
            target.addComponent(new TransformComponent({ x: 1000, y: 1000, z: 0 }));
            mockWorld.getEntities.mockReturnValue([observer]);
            mockWorld.getEntity.mockReturnValue(target);

            const trackComp = observer.getComponent(TrackComponent)!;

            // Tick 1
            mockWorld.currentTick = 1;
            await tms.process(mockWorld, 0.1);
            let track = Array.from(trackComp.tracks.values())[0];
            expect(track.status).toBe(TrackStatus.Coasting); 

            // Tick 2
            mockWorld.currentTick = 2;
            await tms.process(mockWorld, 0.1);
            track = Array.from(trackComp.tracks.values())[0];
            expect(track.status).toBe(TrackStatus.Coasting);

            // Tick 3
            mockWorld.currentTick = 3;
            await tms.process(mockWorld, 0.1);
            track = Array.from(trackComp.tracks.values())[0];
            expect(track.status).toBe(TrackStatus.Active);
        });

        it('should increase track confidence over time with successful detections (Test 57)', async () => {
            const observer = setupObserver('obs', Side.Blue);
            const detection = observer.getComponent(DetectionComponent)!;
            detection.detectedEntityIds.add('tgt-1');

            const target = new Entity('tgt-1', Side.Red);
            target.addComponent(new TransformComponent({ x: 1000, y: 1000, z: 0 }));
            mockWorld.getEntities.mockReturnValue([observer]);
            mockWorld.getEntity.mockReturnValue(target);

            const trackComp = observer.getComponent(TrackComponent)!;

            // Tick 1-5
            let lastConf = 0;
            for(let i=1; i<=5; i++) {
                mockWorld.currentTick = i;
                await tms.process(mockWorld, 0.1);
                let track = Array.from(trackComp.tracks.values())[0];
                if (i === 1) lastConf = track.confidence;
                if (i === 5) expect(track.confidence).toBeGreaterThan(lastConf);
            }
        });

        it('should enter Coasting state when detections are missing (Test 44)', async () => {
            const observer = setupObserver('obs', Side.Blue);
            const detection = observer.getComponent(DetectionComponent)!;
            detection.detectedEntityIds.add('tgt-1');

            const target = new Entity('tgt-1', Side.Red);
            target.addComponent(new TransformComponent({ x: 1000, y: 1000, z: 0 }));
            mockWorld.getEntities.mockReturnValue([observer]);
            mockWorld.getEntity.mockReturnValue(target);

            const trackComp = observer.getComponent(TrackComponent)!;

            for(let i=1; i<=3; i++) {
                mockWorld.currentTick = i;
                await tms.process(mockWorld, 0.1);
            }
            let track = Array.from(trackComp.tracks.values())[0];
            expect(track.status).toBe(TrackStatus.Active);

            detection.detectedEntityIds.clear();
            mockWorld.currentTick = 4;
            await tms.process(mockWorld, 0.1);
            
            track = Array.from(trackComp.tracks.values())[0];
            expect(track.status).toBe(TrackStatus.Coasting);
        });
    });

    describe('Sensor Fusion & Datalink (Tests 47, 48, 53, 58)', () => {
        it('should fuse detections from multiple sensors into a single track (Test 47)', async () => {
            const observer = setupObserver('obs', Side.Blue);
            const detection = observer.getComponent(DetectionComponent)!;
            detection.detectedEntityIds.add('tgt-1');

            const target = new Entity('tgt-1', Side.Red);
            target.addComponent(new TransformComponent({ x: 5000, y: 5000, z: 0 }));
            
            mockWorld.getEntities.mockReturnValue([observer]);
            mockWorld.getEntity.mockReturnValue(target);

            await tms.process(mockWorld, 0.1);

            expect(observer.getComponent(TrackComponent)!.tracks.size).toBe(1);
        });

        it('should generate multiple tracks when multiple entities are detected (Test 58)', async () => {
            const observer = setupObserver('obs', Side.Blue);
            const detection = observer.getComponent(DetectionComponent)!;
            detection.detectedEntityIds.add('tgt-1');
            detection.detectedEntityIds.add('tgt-2');

            const target1 = new Entity('tgt-1', Side.Red);
            target1.addComponent(new TransformComponent({ x: 5000, y: 5000, z: 0 }));
            const target2 = new Entity('tgt-2', Side.Red);
            target2.addComponent(new TransformComponent({ x: 6000, y: 6000, z: 0 }));
            
            mockWorld.getEntities.mockReturnValue([observer]);
            mockWorld.getEntity.mockImplementation((id) => id === 'tgt-1' ? target1 : target2);

            await tms.process(mockWorld, 0.1);

            expect(observer.getComponent(TrackComponent)!.tracks.size).toBe(2);
        });

        it('should share tracks between friendly units via Datalink (Test 48, 53)', async () => {
            const ship1 = setupObserver('ship-1', Side.Blue);
            const dl1 = new DatalinkComponent('NET-1', true, true, true, 0); 
            ship1.addComponent(dl1);

            const ship2 = setupObserver('ship-2', Side.Blue);
            const dl2 = new DatalinkComponent('NET-1', true, true, true, 0); 
            ship2.addComponent(dl2);

            const track: Track = {
                id: 'TRK-1',
                trueEntityId: 'tgt-red',
                position: { x: 10000, y: 10000, z: 0 },
                velocity: { x: 0, y: 0, z: 0 },
                lastSeenTick: 0,
                cepM: 10,
                status: TrackStatus.Active,
                classification: 'Surface',
                identification: IdentificationStatus.HOSTILE,
                confidence: 1.0
            };
            ship1.getComponent(TrackComponent)!.tracks.set(track.id, track);

            mockWorld.getEntities.mockReturnValue([ship1, ship2]);
            mockWorld.currentTick = 5; 

            const commands = await datalinkSystem.process(mockWorld, 0.1);
            
            const syncCmd = commands.find(c => c.entityId === 'ship-2' && c.constructor.name === 'SyncTracksCommand') as any;
            expect(syncCmd).toBeDefined();
            expect(syncCmd.tracks.length).toBe(1);
            expect(syncCmd.tracks[0].trueEntityId).toBe('tgt-red');
        });
    });

    describe('Track Interpolation & Kinematics (Tests 43, 56)', () => {
        it('should interpolate track position based on velocity while coasting (Test 43)', async () => {
            const observer = setupObserver('obs', Side.Blue);
            const trackComp = observer.getComponent(TrackComponent)!;

            const track: Track = {
                id: 'TRK-1',
                trueEntityId: 'tgt-1',
                position: { x: 0, y: 0, z: 0 },
                velocity: { x: 100, y: 0, z: 0 },
                lastSeenTick: 10,
                cepM: 10,
                status: TrackStatus.Coasting,
                classification: 'Unknown',
                identification: IdentificationStatus.HOSTILE,
                confidence: 1.0
            };
            trackComp.tracks.set(track.id, track);

            mockWorld.getEntities.mockReturnValue([observer]);
            mockWorld.currentTick = 11; 
            const dt = 1.0; 

            await tms.process(mockWorld, dt);

            expect(track.position.x).toBeCloseTo(100);
        });

        it('should estimate track velocity from position delta when kinematics missing (Test 56)', async () => {
            const observer = setupObserver('obs', Side.Blue);
            const detection = observer.getComponent(DetectionComponent)!;
            detection.detectedEntityIds.add('tgt-1');

            const target = new Entity('tgt-1', Side.Red);
            target.addComponent(new TransformComponent({ x: 0, y: 0, z: 0 }));
            
            mockWorld.getEntities.mockReturnValue([observer]);
            mockWorld.getEntity.mockReturnValue(target);

            mockWorld.currentTick = 1;
            await tms.process(mockWorld, 1.0);
            
            target.getComponent(TransformComponent)!.position.x = 50;
            mockWorld.currentTick = 2;
            await tms.process(mockWorld, 1.0);

            const track = Array.from(observer.getComponent(TrackComponent)!.tracks.values())[0];
            expect(track.velocity.x).toBeCloseTo(50);
        });
    });

    describe('Classification & Identification (Tests 49-51)', () => {
        it('should classify entity as Air-High based on altitude (Test 49)', async () => {
            const observer = setupObserver('obs', Side.Blue);
            const detection = observer.getComponent(DetectionComponent)!;
            detection.detectedEntityIds.add('tgt-1');

            const target = new Entity('tgt-1', Side.Red);
            target.addComponent(new TransformComponent({ x: 0, y: 0, z: 10000 }));
            
            mockWorld.getEntities.mockReturnValue([observer]);
            mockWorld.getEntity.mockReturnValue(target);

            await tms.process(mockWorld, 0.1);

            const track = Array.from(observer.getComponent(TrackComponent)!.tracks.values())[0];
            expect(track.classification).toBe('Air-High');
        });

        it('should identify friendly tracks automatically via IFF (Test 50)', async () => {
             const observer = setupObserver('obs', Side.Blue);
             const detection = observer.getComponent(DetectionComponent)!;
             detection.detectedEntityIds.add('friendly-1');

             const friend = new Entity('friendly-1', Side.Blue);
             friend.addComponent(new TransformComponent());
             
             mockWorld.getEntities.mockReturnValue([observer]);
             mockWorld.getEntity.mockReturnValue(friend);

             await tms.process(mockWorld, 0.1);

             const track = Array.from(observer.getComponent(TrackComponent)!.tracks.values())[0];
             expect(track.identification).toBe(IdentificationStatus.FRIENDLY);
        });

        it('should mark track as Hostile if it performs a hostile act (Test 51)', async () => {
            const observer = setupObserver('obs', Side.Blue);
            const detection = observer.getComponent(DetectionComponent)!;
            detection.detectedEntityIds.add('tgt-1');

            const target = new Entity('tgt-1', Side.Red);
            target.addComponent(new TransformComponent());
            const combat = new CombatComponent();
            combat.mounts.push({
                name: 'Mount 1',
                magazineIndices: [],
                activeMagazineIndex: 0,
                reloadTicks: 0,
                lastFireTick: 100,
                slewRate: 0,
                currentAzimuth: 0,
                currentElevation: 0,
                minAzimuth: -180,
                maxAzimuth: 180,
                minElevation: -20,
                maxElevation: 85
            });
            target.addComponent(combat);
            
            mockWorld.getEntities.mockReturnValue([observer]);
            mockWorld.getEntity.mockReturnValue(target);
            mockWorld.currentTick = 101; 

            await tms.process(mockWorld, 0.1);

            const track = Array.from(observer.getComponent(TrackComponent)!.tracks.values())[0];
            expect(track.identification).toBe(IdentificationStatus.HOSTILE);
        });
    });

    describe('ESM & Special Cases (Tests 54, 60)', () => {
        it('should generate a bearing track for ESM-only detection (Test 54)', async () => {
            const observer = setupObserver('obs', Side.Blue);
            const detection = observer.getComponent(DetectionComponent)!;
            detection.esmBearings.push({
                observerId: 'obs',
                bearingDeg: 45,
                confidencePct: 100,
                targetId: 'tgt-1'
            });

            const target = new Entity('tgt-1', Side.Red);
            target.addComponent(new TransformComponent({ x: 10000, y: 10000, z: 0 }));
            
            mockWorld.getEntities.mockReturnValue([observer]);
            mockWorld.getEntity.mockReturnValue(target);

            await tms.process(mockWorld, 0.1);

            const track = Array.from(observer.getComponent(TrackComponent)!.tracks.values())[0];
            expect(track.classification).toBe('ESM-Strobe');
            expect(track.cepM).toBeGreaterThan(10000);
        });

        it('should re-acquire a dropped track with a new ID (Test 60)', async () => {
            const observer = setupObserver('obs', Side.Blue);
            const trackComp = observer.getComponent(TrackComponent)!;
            const detection = observer.getComponent(DetectionComponent)!;

            const target = new Entity('tgt-1', Side.Red);
            target.addComponent(new TransformComponent());
            mockWorld.getEntities.mockReturnValue([observer]);
            mockWorld.getEntity.mockReturnValue(target);

            detection.detectedEntityIds.add('tgt-1');
            await tms.process(mockWorld, 0.1);
            const trackId1 = Array.from(trackComp.tracks.keys())[0];

            trackComp.tracks.delete(trackId1);

            mockWorld.currentTick = 500;
            await tms.process(mockWorld, 0.1);
            const trackId2 = Array.from(trackComp.tracks.keys())[0];

            expect(trackId2).not.toBe(trackId1);
            expect(trackId2).toBeDefined();
        });
    });
});

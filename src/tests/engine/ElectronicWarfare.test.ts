import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SensorSystem } from '../../engine/systems/SensorSystem';
import { TrackManagementSystem } from '../../engine/systems/TrackManagementSystem';
import { JammerComponent, JammerType, JammerMode } from '../../engine/components/ElectronicWarfare';
import { SensorComponent, DetectionComponent } from '../../engine/components/Sensors';
import { TransformComponent, KinematicsComponent } from '../../engine/components/Physics';
import { RCSComponent } from '../../engine/components/Signatures';
import { Entity } from '../../engine/core/Entity';
import { IdentificationStatus, SensorType, Side, TrackStatus } from '../../engine/core/Types';
import { DeterministicRandom } from '../../engine/math/DeterministicRandom';
import { TerrainOracle } from '../../engine/environment/TerrainOracle';
import { GeoProjection } from '../../engine/math/GeoProjection';
import { TrackComponent } from '../../engine/components/Track';

describe('Electronic Warfare Unit Tests (Test 59, 162-163)', () => {
    let sensorSystem: SensorSystem;
    let tms: TrackManagementSystem;
    let mockWorld: any;

    beforeEach(() => {
        sensorSystem = new SensorSystem(new TerrainOracle(), new GeoProjection());
        tms = new TrackManagementSystem();
        mockWorld = {
            currentTick: 100,
            timestamp: 10.0,
            isPaused: false,
            random: new DeterministicRandom(42),
            getEntities: vi.fn().mockReturnValue([]),
            getEntity: vi.fn(),
            getNearbyEntities: vi.fn().mockReturnValue([]),
            profileRegistry: {
                get: vi.fn()
            },
            events: {
                emit: vi.fn()
            }
        };
    });

    it('should generate ghost tracks when target uses deceptive jamming (Test 59)', async () => {
        const observer = new Entity('obs', Side.Blue);
        observer.addComponent(new SensorComponent({ sensorType: SensorType.Radar, maxRangeM: 100000 }));
        observer.addComponent(new DetectionComponent());
        observer.addComponent(new TransformComponent({ position: { x: 0, y: 0, z: 1000 } }));

        const target = new Entity('tgt-jammer', Side.Red);
        target.addComponent(new TransformComponent({ position: { x: 10000, y: 0, z: 1000 } }));
        target.addComponent(new RCSComponent({ baseRCS: 10 }));
        target.addComponent(new JammerComponent({
            jammerType: JammerType.SPJ,
            mode: JammerMode.Deceptive,
            isActive: true
        }));

        mockWorld.getEntities.mockReturnValue([observer, target]);
        mockWorld.getNearbyEntities.mockReturnValue([target]);
        mockWorld.getEntity.mockImplementation((id: string) => id === 'tgt-jammer' ? target : undefined);

        const commands = await sensorSystem.process(mockWorld, 0.1);

        // Find AddDetectionCommands for ghosts
        const addCmds = commands.filter(c => c.constructor.name === 'AddDetectionCommand') as any[];
        const ghostCmds = addCmds.filter(c => c.targetId.startsWith('GHOST-'));

        expect(ghostCmds.length).toBeGreaterThan(0);

        // Verify TMS creates tracks for these ghosts
        const realObserver = new Entity('obs-real', Side.Blue);
        realObserver.addComponent(new TrackComponent());
        realObserver.addComponent(new DetectionComponent());
        realObserver.addComponent(new TransformComponent());

        const realDet = realObserver.getComponent(DetectionComponent)!;
        ghostCmds.forEach(c => realDet.detectedEntityIds.add(c.targetId));

        mockWorld.getEntities.mockReturnValue([realObserver]);
        await tms.process(mockWorld, 0.1);

        const tracks = Array.from(realObserver.getComponent(TrackComponent)!.tracks.values());
        const ghostTracks = tracks.filter(t => t.trueEntityId.startsWith('GHOST-'));
        expect(ghostTracks.length).toBeGreaterThan(0);
        expect(ghostTracks[0].cepM).toBeGreaterThan(1000);
    });

    it('should increase track CEP when target is active jamming (Test 59)', async () => {
        const observer = new Entity('obs', Side.Blue);
        const trackComp = new TrackComponent();
        observer.addComponent(trackComp);
        observer.addComponent(new DetectionComponent());
        observer.addComponent(new TransformComponent());

        const target = new Entity('tgt', Side.Red);
        target.addComponent(new TransformComponent({ position: { x: 5000, y: 0, z: 0 } }));
        target.addComponent(new JammerComponent({ isActive: true, mode: JammerMode.Noise }));

        // Initial track
        const trackId = 'TRK-1';
        trackComp.tracks.set(trackId, {
            id: trackId,
            trueEntityId: 'tgt',
            position: { x: 5000, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            firstSeenTick: 0,
            lastSeenTick: 100,
            cepM: 100,
            status: TrackStatus.Active,
            classification: 'Surface',
            identification: IdentificationStatus.HOSTILE,
            confidence: 1.0
        });

        mockWorld.getEntities.mockReturnValue([observer, target]);
        mockWorld.getEntity.mockReturnValue(target);
        observer.getComponent(DetectionComponent)!.detectedEntityIds.add('tgt');

        await tms.process(mockWorld, 0.1);

        const track = trackComp.tracks.get(trackId)!;
        expect(track.cepM).toBeGreaterThan(100); // CEP should expand due to jamming
    });
});

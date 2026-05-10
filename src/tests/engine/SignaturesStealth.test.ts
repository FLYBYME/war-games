import { describe, it, expect, vi, beforeEach } from 'vitest';
import { World } from '../../engine/core/World';
import { SensorSystem } from '../../engine/systems/SensorSystem';
import { SensorComponent, DetectionComponent } from '../../engine/components/Sensors';
import { TransformComponent, KinematicsComponent } from '../../engine/components/Physics';
import { RCSComponent, IRSignatureComponent } from '../../engine/components/Signatures';
import { DoctrineComponent } from '../../engine/components/Doctrine';
import { Entity } from '../../engine/core/Entity';
import { Side, SensorType, EMCONState, EMBand } from '../../engine/core/Types';
import { DeterministicRandom } from '../../engine/math/DeterministicRandom';
import { TerrainOracle } from '../../engine/environment/TerrainOracle';
import { GeoProjection } from '../../engine/math/GeoProjection';

describe('Signatures & Stealth Unit Tests (Tests 161-180)', () => {
    let world: World;
    let sensorSystem: SensorSystem;

    beforeEach(() => {
        world = new World();
        // @ts-ignore
        world.random = new DeterministicRandom(1234);
        sensorSystem = new SensorSystem(new TerrainOracle(), new GeoProjection());
    });

    const setupObserver = (id: string, side: Side, sensorType: SensorType) => {
        const entity = new Entity(id, side);
        entity.addComponent(new TransformComponent({ position: { x: 0, y: 0, z: 1000 } }));
        entity.addComponent(new SensorComponent({ 
            sensorType, 
            maxRangeM: 100000, 
            isActive: true,
            band: EMBand.X
        }));
        entity.addComponent(new DetectionComponent());
        world.addEntity(entity);
        return entity;
    };

    const setupTarget = (id: string, side: Side, pos: { x: number, y: number, z: number }) => {
        const entity = new Entity(id, side);
        entity.addComponent(new TransformComponent({ position: pos }));
        entity.addComponent(new KinematicsComponent({ velocity: { x: 0, y: 0, z: 0 }, massKg: 10000 }));
        entity.addComponent(new RCSComponent({ baseRCS: 5 }));
        world.addEntity(entity);
        return entity;
    };

    it('should have reduced detection range for stealth aircraft (Test 161)', async () => {
        const observer = setupObserver('radar', Side.Blue, SensorType.Radar);
        const target = setupTarget('stealth', Side.Red, { x: 150000, y: 0, z: 1000 }); // 150km
        
        // Stealth RCS (0.1 sqm)
        target.getComponent(RCSComponent)!.baseRCS = 0.1;

        // @ts-ignore
        const mockWorld = {
            getEntities: () => [observer, target],
            getNearbyEntities: () => [target],
            getEntity: (id: string) => id === 'stealth' ? target : observer,
            currentTick: 0,
            random: world.random,
            profileRegistry: world.profileRegistry
        };

        const commands = await sensorSystem.process(mockWorld as any, 0.1);
        const detection = commands.find(c => c.constructor.name === 'AddDetectionCommand');
        
        // At 50km, a 0.1 sqm target should NOT be detected by a standard radar
        expect(detection).toBeUndefined();

        // Move closer
        target.getComponent(TransformComponent)!.position.x = 10000; // 10km
        const commands2 = await sensorSystem.process(mockWorld as any, 0.1);
        expect(commands2.find(c => c.constructor.name === 'AddDetectionCommand')).toBeDefined();
    });

    it('should not emit radar when in EMCON Silent/Charlie (Test 165)', async () => {
        const observer = setupObserver('radar', Side.Blue, SensorType.Radar);
        const doctrine = new DoctrineComponent();
        doctrine.emcon = EMCONState.Silent;
        observer.addComponent(doctrine);
        
        const target = setupTarget('tgt', Side.Red, { x: 5000, y: 0, z: 1000 });

        // @ts-ignore
        const mockWorld = {
            getEntities: () => [observer, target],
            getNearbyEntities: () => [target],
            getEntity: (id: string) => id === 'tgt' ? target : observer,
            currentTick: 0,
            random: world.random,
            profileRegistry: world.profileRegistry
        };

        const commands = await sensorSystem.process(mockWorld as any, 0.1);
        const detection = commands.find(c => c.constructor.name === 'AddDetectionCommand');
        
        expect(detection).toBeUndefined(); // Radar is inhibited
    });

    it('should detect IR signature spikes from afterburners (Test 173)', async () => {
        const observer = setupObserver('irst', Side.Blue, SensorType.IRST);
        const target = setupTarget('tgt', Side.Red, { x: 40000, y: 0, z: 1000 }); // 40km
        const ir = new IRSignatureComponent({ baseIR: 1 });
        target.addComponent(ir);

        // @ts-ignore
        const mockWorld = {
            getEntities: () => [observer, target],
            getNearbyEntities: () => [target],
            getEntity: (id: string) => id === 'tgt' ? target : observer,
            currentTick: 0,
            random: world.random,
            profileRegistry: world.profileRegistry
        };

        // 1. Base IR (1): Not detected at 40km (Max range with IR 1 is 100km * sqrt(0.1) = 31km)
        const commands1 = await sensorSystem.process(mockWorld as any, 0.1);
        expect(commands1.find(c => c.constructor.name === 'AddDetectionCommand')).toBeUndefined();

        // 2. Afterburner: Detected at 40km
        ir.baseIR = 50; // Simulate afterburner
        const commands2 = await sensorSystem.process(mockWorld as any, 0.1);
        expect(commands2.find(c => c.constructor.name === 'AddDetectionCommand')).toBeDefined();
    });

    it('should respect terrain masking (Test 180)', async () => {
        const observer = setupObserver('radar', Side.Blue, SensorType.Radar);
        const target = setupTarget('tgt', Side.Red, { x: 10000, y: 0, z: 100 }); // Low alt
        
        // Mock terrain oracle to return blocked LOS
        const oracle = new TerrainOracle();
        vi.spyOn(oracle, 'isLineOfSightClear').mockResolvedValue(false);
        
        const sensorSystemWithMasking = new SensorSystem(oracle, new GeoProjection());

        // @ts-ignore
        const mockWorld = {
            getEntities: () => [observer, target],
            getNearbyEntities: () => [target],
            getEntity: (id: string) => id === 'tgt' ? target : observer,
            currentTick: 0,
            random: world.random,
            profileRegistry: world.profileRegistry
        };

        const commands = await sensorSystemWithMasking.process(mockWorld as any, 0.1);
        expect(commands.find(c => c.constructor.name === 'AddDetectionCommand')).toBeUndefined();
    });
});

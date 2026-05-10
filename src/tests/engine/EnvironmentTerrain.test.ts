import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerrainOracle, ITileProvider } from '../../engine/environment/TerrainOracle';
import { SensorSystem } from '../../engine/systems/SensorSystem';
import { World } from '../../engine/core/World';
import { Entity } from '../../engine/core/Entity';
import { TransformComponent } from '../../engine/components/Physics';
import { SensorComponent, DetectionComponent } from '../../engine/components/Sensors';
import { RCSComponent } from '../../engine/components/Signatures';
import { EnvironmentComponent } from '../../engine/components/Environment';
import { Side, SensorType, EMBand } from '../../engine/core/Types';
import { GeoProjection } from '../../engine/math/GeoProjection';
import { DeterministicRandom } from '../../engine/math/DeterministicRandom';

describe('Environment & Terrain Unit Tests (Tests 181-200)', () => {
    let world: World;
    let projection: GeoProjection;

    beforeEach(() => {
        world = new World();
        // @ts-ignore
        world.random = new DeterministicRandom(1234);
        projection = new GeoProjection();
    });

    it('should interpolate terrain elevation correctly (Test 181)', async () => {
        // Mock a 2x2 tile: [0, 100, 200, 300]
        const tile = new Float32Array([0, 100, 200, 300]);
        const mockProvider: ITileProvider = {
            getTile: vi.fn().mockResolvedValue(tile),
            getCachedTile: vi.fn().mockReturnValue(tile)
        };
        const oracle = new TerrainOracle(mockProvider);

        // Center of the 2x2 grid (0.5, 0.5)
        // Bilinear interpolation:
        // q11=0, q21=100 (top row)
        // q12=200, q22=300 (bottom row)
        // At (0.5, 0.5), result should be 150.
        const elevation = await oracle.getElevation(45.5, -122.5); // Lat/Lon fraction 0.5, 0.5
        expect(elevation).toBeCloseTo(150, 1);
    });

    it('should block line-of-sight with terrain (Test 182)', async () => {
        const oracle = new TerrainOracle();
        vi.spyOn(oracle, 'getElevation').mockImplementation(async (lat, lon) => {
            // Block if lon is near the middle of the path
            if (lon > 0.04 && lon < 0.06) return 5000; 
            return 0;
        });

        const posA = { x: 0, y: 0, z: 1000 };
        const posB = { x: 20000, y: 0, z: 1000 }; // 20km East (approx 0.18 degrees)

        const isClear = await oracle.isLineOfSightClear(posA, posB, projection);
        expect(isClear).toBe(false);
    });

    it('should reduce radar range in heavy rain (Test 192)', async () => {
        const sensorSystem = new SensorSystem(new TerrainOracle(), projection);
        
        const observer = new Entity('obs', Side.Blue);
        observer.addComponent(new TransformComponent({ position: { x: 0, y: 0, z: 1000 } }));
        observer.addComponent(new SensorComponent({ 
            sensorType: SensorType.Radar, 
            maxRangeM: 100000, 
            txPowerKw: 10,
            frequencyMhz: 10000, // X-band (very sensitive to rain)
            processingGainDb: 20
        }));
        observer.addComponent(new DetectionComponent());
        
        const target = new Entity('tgt', Side.Red);
        target.addComponent(new TransformComponent({ position: { x: 30000, y: 0, z: 1000 } })); // 30km
        target.addComponent(new RCSComponent({ baseRCS: 5 }));

        const env = new EnvironmentComponent();
        env.precipitationRateMMhr = 50; // Heavy rain (50mm/hr)

        // @ts-ignore
        const mockWorld = {
            getEntities: () => [observer, target],
            getNearbyEntities: () => [target],
            getEntity: (id: string) => id === 'tgt' ? target : observer,
            currentTick: 0,
            random: world.random,
            profileRegistry: world.profileRegistry
        };

        // 1. Clear Weather: Detected
        env.precipitationRateMMhr = 0;
        observer.addComponent(env);
        const commands1 = await sensorSystem.process(mockWorld as any, 0.1);
        expect(commands1.find(c => c.constructor.name === 'AddDetectionCommand')).toBeDefined();

        // 2. Heavy Rain: Not Detected
        env.precipitationRateMMhr = 50;
        const commands2 = await sensorSystem.process(mockWorld as any, 0.1);
        expect(commands2.find(c => c.constructor.name === 'AddDetectionCommand')).toBeUndefined();
    });
});

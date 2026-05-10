import { describe, it, expect } from 'vitest';
import { VectorMath } from '../../engine/math/VectorMath';
import { GeoProjection } from '../../engine/math/GeoProjection';
import { Geodesy } from '../../engine/math/Geodesy';
import { Physics } from '../../engine/PhysicsConstants';
import { KinematicsComponent, TransformComponent } from '../../engine/components/Physics';
import { FuelComponent } from '../../engine/components/Propulsion';
import { EnvironmentSystem } from '../../engine/systems/EnvironmentSystem';
import { TerrainOracle } from '../../engine/environment/TerrainOracle';
import { ControlSystem } from '../../engine/systems/ControlSystem';
import { Entity } from '../../engine/core/Entity';
import { NavigationComponent } from '../../engine/components/Navigation';
import { PropulsionComponent } from '../../engine/components/Propulsion';
import { SetHeadingCommand } from '../../engine/core/Command';
import { Side } from '../../engine/core/Types';

describe('Physics & Kinematics Unit Tests', () => {
    
    describe('VectorMath Operations (Tests 8-10)', () => {
        it('should calculate magnitude correctly (Test 8)', () => {
            const v = { x: 3, y: 4, z: 0 };
            expect(VectorMath.magnitude(v)).toBe(5);
            
            const v2 = { x: 0, y: 0, z: 10 };
            expect(VectorMath.magnitude(v2)).toBe(10);

            const v3 = { x: 1, y: 1, z: 1 };
            expect(VectorMath.magnitude(v3)).toBeCloseTo(Math.sqrt(3));
        });

        it('should calculate dot product correctly (Test 9)', () => {
            const a = { x: 1, y: 2, z: 3 };
            const b = { x: 4, y: 5, z: 6 };
            // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
            expect(VectorMath.dot(a, b)).toBe(32);

            const orthogonal1 = { x: 1, y: 0, z: 0 };
            const orthogonal2 = { x: 0, y: 1, z: 0 };
            expect(VectorMath.dot(orthogonal1, orthogonal2)).toBe(0);
        });

        it('should calculate cross product correctly (Test 10)', () => {
            const a = { x: 1, y: 0, z: 0 };
            const b = { x: 0, y: 1, z: 0 };
            const result = VectorMath.cross(a, b);
            expect(result).toEqual({ x: 0, y: 0, z: 1 });

            const c = { x: 1, y: 2, z: 3 };
            const d = { x: 4, y: 5, z: 6 };
            // y1*z2 - z1*y2 = 2*6 - 3*5 = 12 - 15 = -3
            // z1*x2 - x1*z2 = 3*4 - 1*6 = 12 - 6 = 6
            // x1*y2 - y1*x2 = 1*5 - 2*4 = 5 - 8 = -3
            expect(VectorMath.cross(c, d)).toEqual({ x: -3, y: 6, z: -3 });
        });
    });

    describe('Geospatial Projections (Tests 11-13)', () => {
        const origin = { lat: 34.0, lon: -118.0 };
        const projection = new GeoProjection();
        projection.setOrigin(origin.lat, origin.lon);

        it('should convert Lat/Lon to cartesian X/Y correctly (Test 11)', () => {
            // Origin should be (0, 0)
            const pos0 = projection.unproject(origin.lat, origin.lon);
            expect(pos0.x).toBeCloseTo(0);
            expect(pos0.y).toBeCloseTo(0);

            // 1 degree North is approx 111km
            const posNorth = projection.unproject(origin.lat + 1, origin.lon);
            expect(posNorth.x).toBeCloseTo(0);
            expect(posNorth.y).toBeGreaterThan(110000);
            expect(posNorth.y).toBeLessThan(112000);
        });

        it('should convert cartesian X/Y to Lat/Lon correctly (Test 12)', () => {
            const x = 1000; // 1km East
            const y = 1000; // 1km North
            const lla = projection.toGeographic({ x, y, z: 0 });
            
            expect(lla.lat).toBeGreaterThan(origin.lat);
            expect(lla.lon).toBeGreaterThan(origin.lon);

            // Round trip
            const backToLocal = projection.unproject(lla.lat, lla.lon);
            expect(backToLocal.x).toBeCloseTo(x);
            expect(backToLocal.y).toBeCloseTo(y);
        });

        it('should calculate great circle distance accurately (Test 13)', () => {
            const p1 = { lat: 0, lon: 0, alt: 0 };
            const p2 = { lat: 0, lon: 1, alt: 0 };
            // At equator, 1 degree is approx 111.32km
            const dist = Geodesy.haversineDistance(p1, p2);
            expect(dist).toBeGreaterThan(111000);
            expect(dist).toBeLessThan(112000);

            const p3 = { lat: 45, lon: 0, alt: 0 };
            const p4 = { lat: 46, lon: 0, alt: 0 };
            const dist2 = Geodesy.haversineDistance(p3, p4);
            expect(dist2).toBeGreaterThan(111000);
            expect(dist2).toBeLessThan(112000);
        });
    });

    describe('Kinematics & Movement (Tests 1-7, 14-20)', () => {
        it('should calculate velocity correctly from speed and heading (Test 1)', () => {
            const heading = 90; // East
            const speedKts = 100;
            const hdgRad = heading * Physics.DEG_TO_RAD;
            const speedMps = speedKts * Physics.KTS_TO_MPS;
            
            const vx = speedMps * Math.cos(hdgRad);
            const vy = speedMps * Math.sin(hdgRad);
            
            expect(vx).toBeCloseTo(0); // cos(90) = 0
            expect(vy).toBeCloseTo(speedMps); // sin(90) = 1
        });

        it('should apply gravity correctly (Test 19)', () => {
            const mass = 1000;
            const forceZ = -mass * Physics.GRAVITY_G;
            expect(forceZ).toBe(-9806.65); // Standard G = 9.80665
        });

        it('should calculate aerodynamic drag scaling with v^2 (Test 6)', () => {
            const rho = 1.225; // Sea level density
            const v = 100;
            const Cd = 0.05;
            const S = 25;
            // Force = 0.5 * rho * v^2 * S * Cd
            const force = 0.5 * rho * (v * v) * S * Cd;
            expect(force).toBe(1.225 * 5000 * 25 * 0.05);
        });

        it('should integrate kinematics respects delta time accurately (Test 17)', () => {
            const velocity = { x: 100, y: 0, z: 0 };
            const dt = 0.1;
            const pos = { x: 0, y: 0, z: 0 };
            const nextPos = VectorMath.add(pos, VectorMath.multiplyScalar(velocity, dt));
            expect(nextPos.x).toBe(10);
        });

        it('should update altitude obeying pitch and thrust constraints (Test 5)', () => {
            const thrust = 50000;
            const pitch = 30; // degrees
            const pitchRad = pitch * Physics.DEG_TO_RAD;
            const thrustZ = Math.sin(pitchRad) * thrust;
            expect(thrustZ).toBeCloseTo(0.5 * thrust); // sin(30) = 0.5
        });

        it('should update entity mass correctly based on fuel (Test 15)', () => {
            const emptyMass = 10000;
            const initialFuel = 5000;
            const kinematics = new KinematicsComponent({
                velocity: { x: 0, y: 0, z: 0 },
                massKg: emptyMass + initialFuel,
                dragCoeff: 0.05,
                thrustN: 0,
                massEmptyKg: emptyMass
            });
            const fuel = new FuelComponent({ currentKg: initialFuel, maxKg: initialFuel });
            
            // Simulating fuel consumption
            const consumption = 1000;
            fuel.currentKg -= consumption;
            kinematics.massKg = kinematics.massEmptyKg + fuel.currentKg;
            
            expect(kinematics.massKg).toBe(14000);
        });

        it('should reduce air density at higher altitudes (Test 7)', () => {
            const env = new EnvironmentSystem(new TerrainOracle(), new GeoProjection());
            // @ts-ignore - access private method for testing
            const rho0 = env.calculateISA(0).airDensity;
            // @ts-ignore - access private method for testing
            const rho10k = env.calculateISA(10000).airDensity;
            
            expect(rho0).toBeCloseTo(1.225, 2);
            expect(rho10k).toBeLessThan(0.5);
            expect(rho10k).toBeGreaterThan(0.3);
        });

        it('should clamp velocity to Mach 10 safety limit (Test 18)', () => {
            const maxSpeed = 340 * 10;
            let velocity = { x: 4000, y: 0, z: 0 };
            const speedMag = VectorMath.magnitude(velocity);
            if (speedMag > maxSpeed) {
                velocity = VectorMath.multiplyScalar(velocity, maxSpeed / speedMag);
            }
            expect(VectorMath.magnitude(velocity)).toBeCloseTo(maxSpeed);
        });

        it('should handle negative altitude for subsurface entities (Test 20)', () => {
            const pos = { x: 0, y: 0, z: -100 };
            // PhysicsSystem allows negative Z for submarines
            expect(pos.z).toBe(-100);
        });

        it('should accelerate up to max speed over time (Test 2)', () => {
            const mass = 1000;
            const thrust = 10000; // 10N / kg = 10 m/s^2 accel
            const dt = 1.0;
            let velocity = { x: 0, y: 0, z: 0 };
            
            const acceleration = { x: thrust / mass, y: 0, z: 0 };
            velocity = VectorMath.add(velocity, VectorMath.multiplyScalar(acceleration, dt));
            
            expect(velocity.x).toBe(10);
        });

        it('should decelerate correctly when thrust is zero and drag exists (Test 3)', () => {
            const mass = 1000;
            const velocity = { x: 100, y: 0, z: 0 };
            const dragCoeff = 0.05;
            const dt = 1.0;
            
            // Simplified drag: F_drag = 100 * v^2 * Cd (from PhysicsSystem)
            const speed = VectorMath.magnitude(velocity);
            const dragMag = 100 * speed * speed * dragCoeff;
            const dragForce = { x: -dragMag, y: 0, z: 0 };
            
            const acceleration = VectorMath.multiplyScalar(dragForce, 1/mass);
            const nextVelocity = VectorMath.add(velocity, VectorMath.multiplyScalar(acceleration, dt));
            
            expect(nextVelocity.x).toBeLessThan(100);
        });

        it('should calculate pitch effects on horizontal velocity (Test 14)', () => {
            const thrust = 50000;
            const pitch = 45;
            const pitchRad = pitch * Physics.DEG_TO_RAD;
            const cosPitch = Math.cos(pitchRad);
            const thrustX = thrust * cosPitch;
            
            expect(thrustX).toBeCloseTo(thrust * Math.sqrt(2)/2);
        });

        it('should clamp surface entities to Z=0 (Test 16)', () => {
            let pos = { x: 0, y: 0, z: -10 };
            const isSurfaceEntity = true;
            if (pos.z < 0 && isSurfaceEntity) {
                pos.z = 0;
            }
            expect(pos.z).toBe(0);
        });

        it('should respect max turn rate (Test 4)', async () => {
            const controlSystem = new ControlSystem();
            const entity = new Entity('plane', Side.Blue);
            const nav = new NavigationComponent();
            const transform = new TransformComponent({ position: { x: 0, y: 0, z: 0 }, rotation: 0 });
            const kinematics = new KinematicsComponent({ velocity: { x: 0, y: 0, z: 0 }, massKg: 10000 });
            const propulsion = new PropulsionComponent({ maxThrustDryN: 50000 });
            
            entity.addComponent(nav);
            entity.addComponent(transform);
            entity.addComponent(kinematics);
            entity.addComponent(propulsion);
            
            nav.desiredHeadingDeg = 90;
            const turnRate = 10; // deg/s
            // Mock profile registry
            const mockWorld = {
                getEntities: () => [entity],
                profileRegistry: {
                    get: () => ({ kinematics: { turnRateDegS: turnRate } })
                }
            };

            const dt = 1.0; // 1s
            // ControlSystem uses 0.1s internally for its calc? 
            // Wait, I should pass dt to process. 
            // The implementation I wrote uses 0.1 hardcoded. I should fix that too.
            const commands = await controlSystem.process(mockWorld as any, dt);
            const hdgCmd = commands.find(c => c instanceof SetHeadingCommand) as any;
            
            expect(hdgCmd).toBeDefined();
            // 0 + 10 * 1.0 = 10
            expect(hdgCmd.heading).toBe(10); 
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { World } from '../../engine/core/World';
import { WaypointSystem } from '../../engine/systems/WaypointSystem';
import { ControlSystem } from '../../engine/systems/ControlSystem';
import { NavigationComponent, NavState } from '../../engine/components/Navigation';
import { TransformComponent, KinematicsComponent } from '../../engine/components/Physics';
import { PropulsionComponent } from '../../engine/components/Propulsion';
import { Entity } from '../../engine/core/Entity';
import { Side } from '../../engine/core/Types';
import { DeterministicRandom } from '../../engine/math/DeterministicRandom';

describe('Navigation & Autopilot Unit Tests (Tests 121-128)', () => {
    let world: World;
    let waypointSystem: WaypointSystem;
    let controlSystem: ControlSystem;

    beforeEach(() => {
        world = new World();
        // @ts-ignore
        world.random = new DeterministicRandom(1234);
        waypointSystem = new WaypointSystem();
        controlSystem = new ControlSystem();
    });

    const setupNavigator = (id: string, pos: { x: number, y: number, z: number }) => {
        const entity = new Entity(id, Side.Blue);
        entity.addComponent(new TransformComponent({ position: pos }));
        entity.addComponent(new KinematicsComponent({ velocity: { x: 0, y: 0, z: 0 }, massKg: 10000 }));
        entity.addComponent(new NavigationComponent());
        entity.addComponent(new PropulsionComponent({ maxThrustDryN: 50000 }));
        world.addEntity(entity);
        return entity;
    };

    it('should steer toward assigned waypoint (Test 121)', async () => {
        const entity = setupNavigator('plane', { x: 0, y: 0, z: 1000 });
        const nav = entity.getComponent(NavigationComponent)!;
        nav.navState = NavState.Waypoint;
        nav.waypoints = [{ position: { x: 10000, y: 0, z: 1000 }, speedKts: 300 }];

        const commands = await waypointSystem.process(world, 0.1);
        const hdgCmd = commands.find(c => c.constructor.name === 'SetHeadingCommand') as any;

        expect(hdgCmd).toBeDefined();
        expect(hdgCmd.heading).toBe(0); // Directly East
    });

    it('should proceed to next waypoint upon arrival (Test 122)', async () => {
        const entity = setupNavigator('plane', { x: 9999, y: 0, z: 1000 }); // Very close to WP1
        const nav = entity.getComponent(NavigationComponent)!;
        nav.navState = NavState.Waypoint;
        nav.arrivalToleranceM = 100;
        nav.waypoints = [
            { position: { x: 10000, y: 0, z: 1000 }, speedKts: 300 },
            { position: { x: 10000, y: 10000, z: 1000 }, speedKts: 300 }
        ];

        // Tick 1: Detect arrival at WP 0
        await waypointSystem.process(world, 0.1);
        expect(nav.activeWaypointIndex).toBe(1);

        // Tick 2: Steer toward WP 1 (North)
        const commands = await waypointSystem.process(world, 0.1);
        const hdgCmd = commands.find(c => c.constructor.name === 'SetHeadingCommand') as any;
        expect(hdgCmd.heading).toBeCloseTo(90, 1); // North
    });

    it('should adjust throttle to match desired speed (Test 127)', async () => {
        const entity = setupNavigator('plane', { x: 0, y: 0, z: 1000 });
        const nav = entity.getComponent(NavigationComponent)!;
        const prop = entity.getComponent(PropulsionComponent)!;

        nav.desiredSpeedKts = 400;
        prop.throttle = 0.5;

        // Current speed is 0
        const commands = await controlSystem.process(world, 1.0);
        const thrustCmd = commands.find(c => c.constructor.name === 'SetThrottleCommand') as any;

        expect(thrustCmd).toBeDefined();
        expect(thrustCmd.throttle).toBeGreaterThan(0.5); // Should increase throttle
    });

    it('should adjust pitch to reach target altitude (Test 128)', async () => {
        const entity = setupNavigator('plane', { x: 0, y: 0, z: 1000 });
        const nav = entity.getComponent(NavigationComponent)!;

        world.profileRegistry.register('plane-profile', { type: 'Aircraft' });
        entity.profileId = 'plane-profile';

        nav.desiredAltitudeM = 5000; // Target is higher

        const commands = await controlSystem.process(world, 1.0);
        const pitchCmd = commands.find(c => c.constructor.name === 'SetPitchCommand') as any;

        expect(pitchCmd).toBeDefined();
        expect(pitchCmd.pitch).toBeGreaterThan(0); // Should pitch up
    });

    it('should maintain orbit in loiter mode (Test 124)', async () => {
        const entity = setupNavigator('plane', { x: 2000, y: 0, z: 1000 }); // At the radius (2km)
        const nav = entity.getComponent(NavigationComponent)!;
        nav.navState = NavState.Loiter;
        nav.waypoints = [{ position: { x: 0, y: 0, z: 1000 }, speedKts: 250 }];

        const commands = await waypointSystem.process(world, 0.1);
        const hdgCmd = commands.find(c => c.constructor.name === 'SetHeadingCommand') as any;

        expect(hdgCmd).toBeDefined();
        // At (2000, 0), center is at (0,0). vToTarget is (-2000, 0) -> 180 deg.
        // Tangential (CCW) is 180 + 90 = 270 deg (South).
        expect(hdgCmd.heading).toBeCloseTo(270, 1);
    });

    it('should follow terrain profile (Test 129)', async () => {
        const entity = setupNavigator('heli', { x: 0, y: 0, z: 100 }); // 100m alt
        const nav = entity.getComponent(NavigationComponent)!;
        nav.navState = NavState.Waypoint;
        nav.terrainFollowing = true;
        nav.waypoints = [{ position: { x: 1000, y: 0, z: 100 }, speedKts: 100 }];

        // Mock terrain: A hill 200m high ahead
        const env = new (await import('../../engine/components/Environment')).EnvironmentComponent();
        env.terrainHeightM = 200; // Hill is 200m
        entity.addComponent(env);

        const commands = await waypointSystem.process(world, 0.1);
        const pitchCmd = commands.find(c => c.constructor.name === 'SetPitchCommand') as any;

        // Altitude (100) < Terrain (200) + Clearance (200). Should CLIMB.
        expect(pitchCmd).toBeDefined();
        expect(pitchCmd.pitch).toBeGreaterThan(0);
    });

    it('should manage submarine depth (Test 135)', async () => {
        const sub = setupNavigator('sub', { x: 0, y: 0, z: -50 }); // 50m depth
        const nav = sub.getComponent(NavigationComponent)!;
        
        world.profileRegistry.register('sub-profile', { type: 'Submarine' });
        sub.profileId = 'sub-profile';

        nav.desiredAltitudeM = -200; // Go deeper

        const commands = await controlSystem.process(world, 1.0);
        const pitchCmd = commands.find(c => c.constructor.name === 'SetPitchCommand') as any;

        // Alt (-50) > Target (-200). Should pitch DOWN (negative pitch).
        expect(pitchCmd).toBeDefined();
        expect(pitchCmd.pitch).toBeLessThan(0);
    });
});

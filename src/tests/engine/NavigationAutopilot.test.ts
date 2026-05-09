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
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { World } from '../../engine/core/World';
import { LogisticsSystem } from '../../engine/systems/LogisticsSystem';
import { PropulsionSystem } from '../../engine/systems/PropulsionSystem';
import { LogisticsComponent, FacilityComponent, TurnaroundState } from '../../engine/components/Logistics';
import { FuelComponent, PropulsionComponent } from '../../engine/components/Propulsion';
import { Entity } from '../../engine/core/Entity';
import { Side } from '../../engine/core/Types';
import { DeterministicRandom } from '../../engine/math/DeterministicRandom';
import { TransformComponent, KinematicsComponent } from '../../engine/components/Physics';

describe('Logistics & Aviation Unit Tests (Tests 201-220)', () => {
    let world: World;
    let logisticsSystem: LogisticsSystem;
    let propulsionSystem: PropulsionSystem;

    beforeEach(() => {
        world = new World();
        // @ts-ignore
        world.random = new DeterministicRandom(1234);
        logisticsSystem = new LogisticsSystem();
        propulsionSystem = new PropulsionSystem();
    });

    it('should consume fuel based on thrust (Test 201)', async () => {
        const plane = new Entity('plane', Side.Blue);
        plane.addComponent(new PropulsionComponent({ 
            maxThrustDryN: 10000, 
            sfcDry: 0.8, // 0.8 kg/N/hr
            throttle: 1.0,
            abThreshold: 1.1, // Stay in dry thrust
            currentThrustN: 10000,
            spoolRate: 1.0
        }));
        plane.addComponent(new FuelComponent({ currentKg: 1000, maxKg: 1000 }));
        world.addEntity(plane);

        const commands = await propulsionSystem.process(world, 1.0); // 1 second
        const fuelCmd = commands.find(c => c.constructor.name === 'ConsumeFuelCommand') as any;

        expect(fuelCmd).toBeDefined();
        // fuelFlow = (0.8 * 10000) / 3600 = 2.22 kg/s
        expect(fuelCmd.amountKg).toBeCloseTo(2.22, 1);
    });

    it('should handle refueling at facility (Test 206)', async () => {
        const base = new Entity('base', Side.Blue);
        const facility = new FacilityComponent({ fuelReservesKg: 5000 });
        base.addComponent(facility);
        base.addComponent(new TransformComponent({ position: { x: 0, y: 0, z: 0 } }));
        world.addEntity(base);

        const plane = new Entity('plane', Side.Blue);
        const fuel = new FuelComponent({ currentKg: 100, maxKg: 1000 });
        const log = new LogisticsComponent({ 
            state: TurnaroundState.Refueling, 
            currentBaseId: 'base',
            stateStartTick: 0
        });
        plane.addComponent(fuel);
        plane.addComponent(log);
        world.addEntity(plane);

        world.currentTick = 1; // Skip replenishment check at tick 0
        // Tick 1
        await logisticsSystem.process(world, 0.1);

        // transferRate is 50kg per tick
        expect(fuel.currentKg).toBe(150);
        expect(facility.fuelReservesKg).toBe(4950);
    });

    it('should transition through turnaround states (Test 212)', async () => {
        const base = new Entity('base', Side.Blue);
        base.addComponent(new FacilityComponent());
        base.addComponent(new TransformComponent());
        world.addEntity(base);

        const plane = new Entity('plane', Side.Blue);
        const log = new LogisticsComponent({ 
            state: TurnaroundState.Landing, 
            currentBaseId: 'base',
            stateStartTick: 100 
        });
        plane.addComponent(log);
        world.addEntity(plane);

        world.currentTick = 200; // 100 ticks elapsed (10s)
        const commands = await logisticsSystem.process(world, 0.1);
        const stateCmd = commands.find(c => c.constructor.name === 'UpdateLogisticsStateCommand') as any;

        expect(stateCmd).toBeDefined();
        expect(stateCmd.newState).toBe(TurnaroundState.Taxiing);
    });

    it('should detect bingo fuel based on distance to base (Test 202)', async () => {
        const base = new Entity('base', Side.Blue);
        base.addComponent(new TransformComponent({ position: { x: 0, y: 0, z: 0 } }));
        world.addEntity(base);

        const plane = new Entity('plane', Side.Blue);
        plane.addComponent(new TransformComponent({ position: { x: 100000, y: 0, z: 10000 } })); // 100km away
        plane.addComponent(new KinematicsComponent({ velocity: { x: 250, y: 0, z: 0 } })); // 250 m/s
        plane.addComponent(new PropulsionComponent({ currentThrustN: 10000, sfcDry: 0.8, throttle: 1.0 }));
        const fuel = new FuelComponent({ currentKg: 100, maxKg: 1000 });
        plane.addComponent(fuel);
        plane.addComponent(new LogisticsComponent({ currentBaseId: 'base', state: TurnaroundState.InFlight }));
        world.addEntity(plane);

        // Distance = 100km. Speed = 250 m/s. Time = 400s.
        // fuelFlow = 2.22 kg/s. Fuel needed = 400 * 2.22 = 888 kg.
        // Current fuel = 100 kg. Definitely BINGO.
        
        await propulsionSystem.process(world, 0.1);
        expect(fuel.isBingo).toBe(true);
    });
});

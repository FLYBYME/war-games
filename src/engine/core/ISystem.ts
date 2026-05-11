import { Entity } from './Entity.js';
import { Command } from './Command.js';
import { Vector3, TacticalEvent } from './Types.js';
import { EventBus } from './EventBus.js';
import { DeterministicRandom } from '../math/DeterministicRandom.js';
import { ProfileRegistry } from './ProfileRegistry.js';
import { WeaponProfileRegistry } from './WeaponProfileRegistry.js';

export interface SimulationStats {
    blue: number;
    red: number;
    munitionsExpended: number;
}

export interface IWorldView {
    readonly currentTick: number;
    readonly timestamp: number;
    readonly isPaused: boolean;
    readonly random: DeterministicRandom;
    readonly profileRegistry: ProfileRegistry;
    readonly weaponProfiles: WeaponProfileRegistry;
    readonly timeCompression: number;
    readonly stats: SimulationStats;
    readonly events: EventBus;
    queueExternalCommand(cmd: Command): void;
    getEntity(id: string): Entity | undefined;
    getEntities(): IterableIterator<Entity>;
    getNearbyEntities(pos: Vector3, radius: number): Entity[];
    addEntity(entity: Entity): void;
    removeEntity(id: string): void;
    getSystem<T extends ISystem>(ctor: new (...args: never[]) => T): T | undefined;
    recordEvent(event: TacticalEvent): void;
    getTracerSize(): number;
    getOctreeNodeCount(): number;
}

export enum SystemPhase {
    Environment,
    Doctrine,
    Perception,
    Lifecycle,
    Decision,
    Bridge,
    Forces,
    Physics
}

export interface ISystem {
    readonly name: string;
    readonly phase: SystemPhase;
    readonly dependencies: string[];

    /**
     * process: Pure logic phase.
     * V3: Returns a Promise of Commands to allow for I/O (Terrain/Atmosphere).
     */
    process(world: IWorldView, dt: number): Promise<Command[]>;
}

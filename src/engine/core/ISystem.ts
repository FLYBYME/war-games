import { Entity } from './Entity.js';
import { Command } from './Command.js';
import { Vector3 } from './Types.js';
import { TacticalEvent } from '../components/Telemetry.js';
import { EventBus } from './EventBus.js';

export interface IWorldView {
    readonly currentTick: number;
    readonly timestamp: number;
    readonly isPaused: boolean;
    readonly profileRegistry: any;
    readonly weaponProfiles: any;
    readonly events: EventBus;
    getEntity(id: string): Entity | undefined;
    getEntities(): IterableIterator<Entity>;
    getNearbyEntities(pos: Vector3, radius: number): Entity[];
    recordEvent(event: TacticalEvent): void;
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

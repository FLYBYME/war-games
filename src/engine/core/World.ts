import { Entity } from './Entity.js';
import { EntityId, Vector3, WorldState, WorldStateSchema, SimulationEvent, TacticalEvent } from './Types.js';
import {
    Command, SetPositionCommand, SetHeadingCommand, SetPitchCommand, SetAltitudeCommand, SetSpeedCommand,
    UpdateKinematicsCommand, SetThrottleCommand, ApplyForceCommand,
    AddDetectionCommand, RemoveDetectionCommand,
    NextWeaponStageCommand, UpdateStageTicksCommand,
    FireWeaponCommand, FireSalvoCommand, ApplyDamageCommand, DestroyEntityCommand, DetonateCommand,
    UpdateEnvironmentCommand, CreateTrackCommand, UpdateTrackCommand,
    DropTrackCommand, UpdateMountSlewCommand, SyncTracksCommand, UpdateSensorScanCommand,
    UpdateThrustCommand, ConsumeFuelCommand,
    LandAtFacilityCommand, LaunchAircraftCommand, UpdateLogisticsStateCommand, TransferResourcesCommand,
    ApplySubsystemDamageCommand, SetConditionCommand,
    AddWaypointCommand, ClearWaypointsCommand, JoinFormationCommand, BreakFormationCommand, SetFormationCommand,
    SetSensorStateCommand, SetEMCONCommand, SetROECommand, SetSideROECommand, SetMissionROECommand,
    SetMissionCommand, SetIntentCommand, SetLoadoutCommand, UpdateWRARulesCommand, AssignWeaponCommand,
    SetEnvironmentCommand, SpawnEntityCommand, ChangeSideCommand, SetSimulationSpeedCommand
} from './Command.js';
import { CommandDispatcher } from './CommandDispatcher.js';
import { EventBus } from './EventBus.js';
import { ProfileRegistry } from './ProfileRegistry.js';
import { WeaponProfileRegistry } from './WeaponProfileRegistry.js';
import { LoadoutRegistry } from './LoadoutRegistry.js';
import { Octree } from './Octree.js';
import { Tracer } from './Tracer.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { ComponentRegistry } from './ComponentRegistry.js';
import { SimulationClock } from './SimulationClock.js';
import { LogisticsSystem } from '../systems/LogisticsSystem.js';
import { ThreatMapSystem } from '../systems/ThreatMapSystem.js';
import { DeterministicRandom } from '../math/DeterministicRandom.js';

import * as PhysicsHandlers from './handlers/PhysicsCommandHandlers.js';
import * as CombatHandlers from './handlers/CombatCommandHandlers.js';
import * as SensorHandlers from './handlers/SensorCommandHandlers.js';
import * as TrackHandlers from './handlers/TrackCommandHandlers.js';
import * as LogisticsHandlers from './handlers/LogisticsCommandHandlers.js';
import * as DoctrineHandlers from './handlers/DoctrineCommandHandlers.js';
import * as SystemHandlers from './handlers/SystemCommandHandlers.js';
import * as NavHandlers from './handlers/NavigationCommandHandlers.js';

import { Side } from './Types.js';
import { IWorldView, SystemPhase, ISystem } from './ISystem.js';
import { logger } from './Logger.js';

export interface SideLogistics {
    fuelStockpileKg: number;
    ammoStockpile: Map<string, number>; // weaponProfileId -> count
}

/**
 * World: The container for physical reality.
 * Manages entities, systems, and the command resolution cycle.
 */
export class World implements IWorldView {
    public readonly clock = new SimulationClock();
    public readonly random = new DeterministicRandom();
    private readonly entities = new Map<EntityId, Entity>();
    private readonly systems: ISystem[] = [];
    private readonly systemsByPhase = new Map<SystemPhase, ISystem[]>();
    private readonly dispatcher = new CommandDispatcher();
    public readonly grid = new Octree();

    public sideLogistics = new Map<Side, SideLogistics>();

    public currentTick: number = 0;
    public timestamp: number = 0;
    public stateSequence: number = 0;
    public seed: number = 0;

    public get isPaused(): boolean { return this.clock.isPaused; }
    public set isPaused(val: boolean) { this.clock.isPaused = val; }
    public get timeCompression(): number { return this.clock.timeCompression; }

    constructor(
        public readonly tracer: Tracer = new Tracer(),
        public readonly events: EventBus = new EventBus(),
        public readonly profileRegistry: ProfileRegistry = new ProfileRegistry(),
        public readonly weaponProfiles: WeaponProfileRegistry = new WeaponProfileRegistry(),
        public readonly loadoutRegistry: LoadoutRegistry = new LoadoutRegistry(),
        seed: number = 0
    ) {
        this.seed = seed;
        this.random = new DeterministicRandom(seed);
        this.addSystem(new LogisticsSystem());
        this.addSystem(new ThreatMapSystem(this.weaponProfiles));
        this.registerDefaultHandlers();
        this.initAdvancedState();
    }

    private initAdvancedState() {
        // Initialize Blue/Red stockpiles
        this.sideLogistics.set(Side.Blue, { fuelStockpileKg: 10000000, ammoStockpile: new Map() });
        this.sideLogistics.set(Side.Red, { fuelStockpileKg: 10000000, ammoStockpile: new Map() });
    }

    private registerDefaultHandlers(): void {
        // Physics
        this.dispatcher.register(SetPositionCommand, new PhysicsHandlers.SetPositionHandler());
        this.dispatcher.register(SetHeadingCommand, new PhysicsHandlers.SetHeadingHandler());
        this.dispatcher.register(SetPitchCommand, new PhysicsHandlers.SetPitchHandler());
        this.dispatcher.register(SetAltitudeCommand, new PhysicsHandlers.SetAltitudeHandler());
        this.dispatcher.register(SetSpeedCommand, new PhysicsHandlers.SetSpeedHandler());
        this.dispatcher.register(UpdateKinematicsCommand, new PhysicsHandlers.UpdateKinematicsHandler());
        this.dispatcher.register(SetThrottleCommand, new PhysicsHandlers.SetThrottleHandler());
        this.dispatcher.register(ApplyForceCommand, new PhysicsHandlers.ApplyForceHandler());
        this.dispatcher.register(UpdateThrustCommand, new PhysicsHandlers.UpdateThrustHandler());

        // Combat
        this.dispatcher.register(FireWeaponCommand, new CombatHandlers.FireWeaponHandler());
        this.dispatcher.register(FireSalvoCommand, new CombatHandlers.FireSalvoHandler());
        this.dispatcher.register(ApplyDamageCommand, new CombatHandlers.ApplyDamageHandler());
        this.dispatcher.register(ApplySubsystemDamageCommand, new CombatHandlers.ApplySubsystemDamageHandler());
        this.dispatcher.register(SetConditionCommand, new CombatHandlers.SetConditionHandler());
        this.dispatcher.register(DestroyEntityCommand, new CombatHandlers.DestroyEntityHandler());
        this.dispatcher.register(DetonateCommand, new CombatHandlers.DetonateHandler());

        // Sensors & Tracks
        this.dispatcher.register(AddDetectionCommand, new SensorHandlers.AddDetectionHandler());
        this.dispatcher.register(RemoveDetectionCommand, new SensorHandlers.RemoveDetectionHandler());
        this.dispatcher.register(UpdateSensorScanCommand, new SensorHandlers.UpdateSensorScanHandler());
        this.dispatcher.register(CreateTrackCommand, new TrackHandlers.CreateTrackHandler());
        this.dispatcher.register(UpdateTrackCommand, new TrackHandlers.UpdateTrackHandler());
        this.dispatcher.register(DropTrackCommand, new TrackHandlers.DropTrackHandler());
        this.dispatcher.register(SyncTracksCommand, new TrackHandlers.SyncTracksHandler());

        // Navigation
        this.dispatcher.register(AddWaypointCommand, new NavHandlers.AddWaypointHandler());
        this.dispatcher.register(ClearWaypointsCommand, new NavHandlers.ClearWaypointsHandler());
        this.dispatcher.register(JoinFormationCommand, new NavHandlers.JoinFormationHandler());
        this.dispatcher.register(BreakFormationCommand, new NavHandlers.BreakFormationHandler());

        // Logistics
        this.dispatcher.register(LandAtFacilityCommand, new LogisticsHandlers.LandAtFacilityHandler());
        this.dispatcher.register(LaunchAircraftCommand, new LogisticsHandlers.LaunchAircraftHandler());

        // Doctrine
        this.dispatcher.register(SetROECommand, new DoctrineHandlers.SetROEHandler());
        this.dispatcher.register(SetSideROECommand, new DoctrineHandlers.SetSideROEHandler());

        // System
        this.dispatcher.register(SetSimulationSpeedCommand, new SystemHandlers.SetSimulationSpeedHandler());
        this.dispatcher.register(SetMissionCommand, new DoctrineHandlers.SetMissionHandler());
        this.dispatcher.register(SetIntentCommand, new DoctrineHandlers.SetIntentHandler());
        this.dispatcher.register(SetLoadoutCommand, new DoctrineHandlers.SetLoadoutHandler());
        this.dispatcher.register(UpdateWRARulesCommand, new DoctrineHandlers.UpdateWRARulesHandler());
        this.dispatcher.register(AssignWeaponCommand, new DoctrineHandlers.AssignWeaponHandler());
        this.dispatcher.register(SetEnvironmentCommand, new SystemHandlers.SetEnvironmentHandler());
        this.dispatcher.register(SpawnEntityCommand, new SystemHandlers.SpawnEntityHandler());
    }

    public async tick(dt: number): Promise<void> {
        if (this.clock.isPaused) return;

        const timeStep = dt * this.clock.timeCompression;
        const subSteps = this.clock.isHighFidelity ? 10 : 1;
        const subDt = timeStep / subSteps;

        for (let s = 0; s < subSteps; s++) {
            this.currentTick++;
            this.timestamp += subDt;

            const simulationPhases = [
                SystemPhase.Doctrine,
                SystemPhase.Decision,
                SystemPhase.Perception,
                SystemPhase.Forces,
                SystemPhase.Physics,
                SystemPhase.Lifecycle
            ];

            const phaseTimes: Record<string, number> = {};

            // 0. Reset net forces for physics resolution
            for (const entity of this.entities.values()) {
                const kin = entity.getComponent(KinematicsComponent);
                if (kin) kin.netForce = { x: 0, y: 0, z: 0 };
            }

            // 2. Execute Simulation Loop
            try {
                for (const phase of simulationPhases) {
                    const phaseStart = performance.now();
                    const systems = this.systemsByPhase.get(phase) || [];
                    const phaseCommands: Command[] = [];
                    
                    for (const system of systems) {
                        const sysCommands = await system.process(this, subDt);
                        phaseCommands.push(...sysCommands);
                    }

                    // Resolve commands immediately after each phase
                    this.resolveCommands(phaseCommands);
                    
                    phaseTimes[SystemPhase[phase]] = performance.now() - phaseStart;
                }

                // 3. Update Spatial Partitioning
                const spatialStart = performance.now();
                for (const entity of this.entities.values()) {
                    const transform = entity.getComponent(TransformComponent);
                    if (transform) {
                        this.grid.updateEntity(entity.id, transform.position);
                    }
                }
                phaseTimes['spatialGrid'] = performance.now() - spatialStart;
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                logger.error(`Simulation tick failed`, { error: message });
            }

            this.events.emit({
                type: 'TickCompleted',
                tick: this.currentTick,
                data: { phaseTimes }
            });
        }
    }

    public resolveCommands(commands: Command[]): void {
        // Sort by priority
        commands.sort((a, b) => a.priority - b.priority);

        for (const cmd of commands) {
            this.dispatcher.dispatch(cmd, this);
            this.tracer.record(this.currentTick, cmd);
        }
    }

    public queueExternalCommand(cmd: Command): void {
        cmd.isExternal = true;
        this.resolveCommands([cmd]);
    }

    public addEntity(entity: Entity): void {
        this.entities.set(entity.id, entity);
        const transform = entity.getComponent(TransformComponent);
        if (transform) {
            this.grid.updateEntity(entity.id, transform.position);
        }
        logger.info(`Entity added: ${entity.id}`, { side: entity.side });
    }

    public removeEntity(id: EntityId): void {
        this.entities.delete(id);
        this.grid.removeEntity(id);
        logger.info(`Entity removed: ${id}`);
        this.events.emit({
            type: 'EntityRemoved',
            tick: this.currentTick,
            entityId: id,
            data: {}
        });
    }

    public getEntity(id: EntityId): Entity | undefined {
        return this.entities.get(id);
    }

    public getEntities(): IterableIterator<Entity> {
        return this.entities.values();
    }

    public getNearbyEntities(center: Vector3, radius: number): Entity[] {
        const ids = this.grid.getNearbyEntities(center, radius);
        return ids.map(id => this.entities.get(id)).filter(e => e !== undefined) as Entity[];
    }

    public addSystem(system: ISystem): void {
        this.systems.push(system);
        const phaseSystems = this.systemsByPhase.get(system.phase) || [];
        phaseSystems.push(system);
        this.systemsByPhase.set(system.phase, phaseSystems);
    }

    public getSystem<T extends ISystem>(ctor: { new(...args: any[]): T }): T | undefined {
        return this.systems.find(s => s instanceof ctor) as T | undefined;
    }

    public recordEvent(event: SimulationEvent): void {
        this.events.emit(event);
    }

    public toJSON(): WorldState {
        const entitiesData = [];
        for (const entity of this.entities.values()) {
            const eData = {
                id: entity.id,
                side: entity.side,
                parentId: entity.parentEntityId,
                components: entity.getAllComponents().map(c => ({
                    type: c.type,
                    data: c
                }))
            };
            entitiesData.push(eData);
        }

        const json: WorldState = {
            currentTick: this.currentTick,
            seed: this.seed,
            entities: entitiesData
        };
        return WorldStateSchema.parse(json);
    }

    /**
     * fromJSON: Hydrates a world from serialized data.
     */
    public static fromJSON(data: WorldState): World {
        const world = new World(undefined, undefined, undefined, undefined, undefined, data.seed || 0);
        world.currentTick = data.currentTick || 0;

        for (const eData of data.entities) {
            const entity = new Entity(eData.id, eData.side as Side, eData.parentId);
            for (const cData of eData.components) {
                const component = ComponentRegistry.create(cData.type, cData.data);
                if (component) {
                    entity.addComponent(component);
                }
            }
            world.addEntity(entity);
        }

        return world;
    }
}

import { Entity } from './Entity.js';
import { EntityId, Track, Vector3, WorldState, WorldStateSchema, SimulationEvent } from './Types.js';
import {
    Command, SetPositionCommand, SetHeadingCommand, SetPitchCommand, SetAltitudeCommand, SetSpeedCommand,
    UpdateKinematicsCommand, SetThrustCommand, ApplyForceCommand,
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
    SetMissionCommand, SetLoadoutCommand, AssignWeaponCommand, UpdateWRARulesCommand, SetEnvironmentCommand,
    SyncESMBearingsCommand, SpawnEntityCommand, SetIntentCommand, ChangeSideCommand
} from './Command.js';
import { ISystem, IWorldView, SystemPhase } from './ISystem.js';
import { CommandDispatcher } from './CommandDispatcher.js';
import * as PhysicsHandlers from './handlers/PhysicsCommandHandlers.js';
import * as CombatHandlers from './handlers/CombatCommandHandlers.js';
import * as LogisticsHandlers from './handlers/LogisticsCommandHandlers.js';
import * as SensorHandlers from './handlers/SensorCommandHandlers.js';
import * as TrackHandlers from './handlers/TrackCommandHandlers.js';
import * as NavigationHandlers from './handlers/NavigationCommandHandlers.js';
import * as DoctrineHandlers from './handlers/DoctrineCommandHandlers.js';
import * as EnvironmentHandlers from './handlers/EnvironmentCommandHandlers.js';
import * as SystemHandlers from './handlers/SystemCommandHandlers.js';

import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { SensorComponent } from '../components/Sensors.js';
import { FuelComponent } from '../components/Propulsion.js';
import { WeaponStageComponent } from '../components/WeaponStages.js';
import { CombatComponent } from '../components/Combat.js';
import { HealthComponent } from '../components/Health.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { TrackComponent } from '../components/Track.js';
import { DoctrineComponent } from '../components/Doctrine.js';
import { FacilityComponent, LogisticsComponent } from '../components/Logistics.js';
import { NavigationComponent, FormationComponent } from '../components/Navigation.js';
import { GroupComponent } from '../components/Group.js';
import { LoadoutRegistry } from './LoadoutRegistry.js';
import { ProfileRegistry } from './ProfileRegistry.js';
import { WeaponProfileRegistry } from './WeaponProfileRegistry.js';
import { Octree } from './Octree.js';
import { EventBus } from './EventBus.js';
import { Tracer } from './Tracer.js';
import { TacticalEvent } from '../components/Telemetry.js';
import { Side } from './Types.js';
import { logger } from './Logger.js';
import { ComponentRegistry } from './ComponentRegistry.js';
import { SimulationClock } from './SimulationClock.js';
import { LogisticsSystem } from '../systems/LogisticsSystem.js';
import { ThreatMapSystem } from '../systems/ThreatMapSystem.js';

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
    private readonly entities = new Map<EntityId, Entity>();
    private readonly systems: ISystem[] = [];
    private readonly systemsByPhase = new Map<SystemPhase, ISystem[]>();
    private readonly dispatcher = new CommandDispatcher();
    public readonly grid = new Octree();

    // --- Advanced World State ---
    public sideLogistics = new Map<Side, SideLogistics>();
    public environmentDetails = {
        thermalLayers: [] as { depth: number, temperature: number }[],
        magVariation: 0,
        ionosphereDensity: 1.0
    };

    public currentTick: number = 0;
    public timestamp: number = 0;
    public stateSequence: number = 0;

    public get isPaused(): boolean { return this.clock.isPaused; }
    public set isPaused(val: boolean) { this.clock.isPaused = val; }
    public get timeCompression(): number { return this.clock.timeCompression; }

    private readonly tickHistory: number[] = [];
    private readonly MAX_HISTORY = 1000;

    constructor(
        public readonly tracer: Tracer = new Tracer(),
        public readonly events: EventBus = new EventBus(),
        public readonly profileRegistry: ProfileRegistry = new ProfileRegistry(),
        public readonly weaponProfiles: WeaponProfileRegistry = new WeaponProfileRegistry(),
        public readonly loadoutRegistry: LoadoutRegistry = new LoadoutRegistry()
    ) {
        this.addSystem(new LogisticsSystem());
        this.addSystem(new ThreatMapSystem(this.weaponProfiles));
        this.registerDefaultHandlers();
        this.initAdvancedState();
    }

    private initAdvancedState() {
        [Side.Blue, Side.Red, Side.Neutral].forEach(side => {
            this.sideLogistics.set(side as Side, {
                fuelStockpileKg: 1_000_000,
                ammoStockpile: new Map()
            });
        });

        // Simple default thermocline
        this.environmentDetails.thermalLayers = [
            { depth: 0, temperature: 18 },
            { depth: 200, temperature: 12 },
            { depth: 500, temperature: 4 }
        ];
    }

    private registerDefaultHandlers(): void {
        // Physics
        this.dispatcher.register(SetPositionCommand, new PhysicsHandlers.SetPositionHandler());
        this.dispatcher.register(SetHeadingCommand, new PhysicsHandlers.SetHeadingHandler());
        this.dispatcher.register(SetPitchCommand, new PhysicsHandlers.SetPitchHandler());
        this.dispatcher.register(SetAltitudeCommand, new PhysicsHandlers.SetAltitudeHandler());
        this.dispatcher.register(SetSpeedCommand, new PhysicsHandlers.SetSpeedHandler());
        this.dispatcher.register(UpdateKinematicsCommand, new PhysicsHandlers.UpdateKinematicsHandler());
        this.dispatcher.register(SetThrustCommand, new PhysicsHandlers.SetThrustHandler());
        this.dispatcher.register(UpdateThrustCommand, new PhysicsHandlers.UpdateThrustHandler());
        this.dispatcher.register(ApplyForceCommand, new PhysicsHandlers.ApplyForceHandler());

        // Combat
        this.dispatcher.register(FireWeaponCommand, new CombatHandlers.FireWeaponHandler());
        this.dispatcher.register(FireSalvoCommand, new CombatHandlers.FireSalvoHandler());
        this.dispatcher.register(ApplyDamageCommand, new CombatHandlers.ApplyDamageHandler());
        this.dispatcher.register(DestroyEntityCommand, new CombatHandlers.DestroyEntityHandler());
        this.dispatcher.register(DetonateCommand, new CombatHandlers.DetonateHandler());
        this.dispatcher.register(ApplySubsystemDamageCommand, new CombatHandlers.ApplySubsystemDamageHandler());
        this.dispatcher.register(SetConditionCommand, new CombatHandlers.SetConditionHandler());
        this.dispatcher.register(NextWeaponStageCommand, new CombatHandlers.NextWeaponStageHandler());
        this.dispatcher.register(UpdateStageTicksCommand, new CombatHandlers.UpdateStageTicksHandler());

        // Logistics
        this.dispatcher.register(LandAtFacilityCommand, new LogisticsHandlers.LandAtFacilityHandler());
        this.dispatcher.register(LaunchAircraftCommand, new LogisticsHandlers.LaunchAircraftHandler());
        this.dispatcher.register(UpdateLogisticsStateCommand, new LogisticsHandlers.UpdateLogisticsStateHandler());
        this.dispatcher.register(TransferResourcesCommand, new LogisticsHandlers.TransferResourcesHandler());
        this.dispatcher.register(ConsumeFuelCommand, new LogisticsHandlers.ConsumeFuelHandler());

        // System
        this.dispatcher.register(SpawnEntityCommand, new SystemHandlers.SpawnEntityHandler());
        this.dispatcher.register(ChangeSideCommand, new SystemHandlers.ChangeSideHandler());

        // Sensors
        this.dispatcher.register(UpdateMountSlewCommand, new SensorHandlers.UpdateMountSlewHandler());
        this.dispatcher.register(UpdateSensorScanCommand, new SensorHandlers.UpdateSensorScanHandler());
        this.dispatcher.register(SetSensorStateCommand, new SensorHandlers.SetSensorStateHandler());
        this.dispatcher.register(SetEMCONCommand, new SensorHandlers.SetEMCONHandler());
        this.dispatcher.register(AddDetectionCommand, new SensorHandlers.AddDetectionHandler());
        this.dispatcher.register(RemoveDetectionCommand, new SensorHandlers.RemoveDetectionHandler());
        this.dispatcher.register(SyncESMBearingsCommand, new SensorHandlers.SyncESMBearingsHandler());

        // Tracks
        this.dispatcher.register(CreateTrackCommand, new TrackHandlers.CreateTrackHandler());
        this.dispatcher.register(UpdateTrackCommand, new TrackHandlers.UpdateTrackHandler());
        this.dispatcher.register(DropTrackCommand, new TrackHandlers.DropTrackHandler());
        this.dispatcher.register(SyncTracksCommand, new TrackHandlers.SyncTracksHandler());
        this.dispatcher.register(RemoveDetectionCommand, new TrackHandlers.RemoveDetectionHandler());

        // Navigation
        this.dispatcher.register(AddWaypointCommand, new NavigationHandlers.AddWaypointHandler());
        this.dispatcher.register(ClearWaypointsCommand, new NavigationHandlers.ClearWaypointsHandler());
        this.dispatcher.register(JoinFormationCommand, new NavigationHandlers.JoinFormationHandler());
        this.dispatcher.register(BreakFormationCommand, new NavigationHandlers.BreakFormationHandler());
        this.dispatcher.register(SetFormationCommand, new NavigationHandlers.SetFormationHandler());

        // Doctrine
        this.dispatcher.register(SetROECommand, new DoctrineHandlers.SetROEHandler());
        this.dispatcher.register(SetSideROECommand, new DoctrineHandlers.SetSideROEHandler());
        this.dispatcher.register(SetMissionROECommand, new DoctrineHandlers.SetMissionROEHandler());
        this.dispatcher.register(SetMissionCommand, new DoctrineHandlers.SetMissionHandler());
        this.dispatcher.register(SetLoadoutCommand, new DoctrineHandlers.SetLoadoutHandler());
        this.dispatcher.register(UpdateWRARulesCommand, new DoctrineHandlers.UpdateWRARulesHandler());
        this.dispatcher.register(AssignWeaponCommand, new DoctrineHandlers.AssignWeaponHandler());
        this.dispatcher.register(SetIntentCommand, new DoctrineHandlers.SetIntentHandler());

        // Environment
        this.dispatcher.register(UpdateEnvironmentCommand, new EnvironmentHandlers.UpdateEnvironmentHandler());
        this.dispatcher.register(SetEnvironmentCommand, new EnvironmentHandlers.SetEnvironmentHandler());
    }

    public recordEvent(event: TacticalEvent): void {
        this.events.emit({
            type: 'TacticalEvent',
            tick: this.currentTick,
            data: event
        });
    }

    private externalCommandQueue: Command[] = [];

    public queueExternalCommand(cmd: Command): void {
        cmd.isExternal = true;
        this.externalCommandQueue.push(cmd);
    }

    public addEntity(entity: Entity): void {
        this.entities.set(entity.id, entity);
        logger.info(`Entity added: ${entity.id}`, { side: entity.side });
        const transform = entity.getComponent(TransformComponent);
        if (transform) {
            this.grid.updateEntity(entity.id, transform.position);
        }
    }

    public removeEntity(id: EntityId): void {
        this.entities.delete(id);
        this.grid.removeEntity(id);
        logger.info(`Entity removed: ${id}`);
    }

    public getEntity(id: EntityId): Entity | undefined {
        return this.entities.get(id);
    }

    public getEntities(): IterableIterator<Entity> {
        return this.entities.values();
    }

    public getNearbyEntities(pos: Vector3, radius: number): Entity[] {
        const ids = this.grid.getNearbyEntities(pos, radius);
        return ids.map(id => this.entities.get(id)!).filter(Boolean);
    }

    public addSystem(system: ISystem): void {
        this.systems.push(system);
        const phaseList = this.systemsByPhase.get(system.phase) || [];
        phaseList.push(system);
        this.systemsByPhase.set(system.phase, phaseList);
    }

    public getSystem<T extends ISystem>(identifier: (new (...args: any[]) => T) | string): T | undefined {
        if (typeof identifier === 'string') {
            return this.systems.find(s => s.name === identifier) as T | undefined;
        }
        return this.systems.find(s => s instanceof identifier) as T | undefined;
    }

    public async tick(dt: number, force: boolean = false): Promise<void> {
        const tickStart = performance.now();
        this.stateSequence++;

        const phaseTimes: Record<string, number> = {};

        // 0. Reset net forces for physics resolution
        for (const entity of this.entities.values()) {
            const kin = entity.getComponent(KinematicsComponent);
            if (kin) kin.netForce = { x: 0, y: 0, z: 0 };
        }

        // 1. Process queued external commands (Always process, even if simulation is paused)
        const externalCommands: Command[] = [];
        while (this.externalCommandQueue.length > 0) {
            const cmd = this.externalCommandQueue.shift();
            if (cmd) externalCommands.push(cmd);
        }

        const extStart = performance.now();
        this.resolveCommands(externalCommands);
        phaseTimes['externalCommands'] = performance.now() - extStart;

        if (!this.clock.isPaused || force) {
            this.currentTick++;
            this.timestamp += dt;
            if (this.currentTick % 100 === 0) {
                logger.debug(`Simulation tick: ${this.currentTick}`);
            }

            const simulationPhases = [
                SystemPhase.Environment,
                SystemPhase.Doctrine,
                SystemPhase.Perception,
                SystemPhase.Lifecycle,
                SystemPhase.Decision,
                SystemPhase.Forces,
                SystemPhase.Physics
            ];

            // 2. Execute Simulation Loop
            const systemCommands: Command[] = [];
            try {
                for (const phase of simulationPhases) {
                    const phaseStart = performance.now();
                    const systems = this.systemsByPhase.get(phase) || [];
                    for (const system of systems) {
                        const sysCommands = await system.process(this, dt);
                        systemCommands.push(...sysCommands);
                    }
                    phaseTimes[SystemPhase[phase]] = performance.now() - phaseStart;
                }

                // 3. Resolve Simulation Commands
                const resolveStart = performance.now();
                this.resolveCommands(systemCommands);
                phaseTimes['resolveCommands'] = performance.now() - resolveStart;

                // 4. Update Spatial Partitioning
                const spatialStart = performance.now();
                for (const entity of this.entities.values()) {
                    const transform = entity.getComponent(TransformComponent);
                    if (transform) {
                        this.grid.updateEntity(entity.id, transform.position);
                    }
                }
                phaseTimes['spatialGrid'] = performance.now() - spatialStart;
            } catch (err: any) {
                logger.error(`FATAL CRASH in Simulation Loop (Tick ${this.currentTick}): ${err.message}`, { stack: err.stack });
                throw err;
            }
        }

        // 5. Execute Bridge Phase (Reporting) - ALWAYS run to keep UI in sync
        const bridgeStart = performance.now();
        const bridgeSystems = this.systemsByPhase.get(SystemPhase.Bridge) || [];
        for (const system of bridgeSystems) {
            await system.process(this, dt);
        }
        phaseTimes['Bridge'] = performance.now() - bridgeStart;

        const totalDuration = performance.now() - tickStart;
        this.recordPerformance(totalDuration, phaseTimes);
    }

    private recordPerformance(durationMs: number, phaseTimes: Record<string, number>): void {
        this.tickHistory.push(durationMs);
        if (this.tickHistory.length > this.MAX_HISTORY) {
            this.tickHistory.shift();
        }

        // Emit every 10 ticks to avoid event bus flooding
        if (this.currentTick % 10 === 0 && this.currentTick > 0) {
            const avg = this.tickHistory.reduce((a, b) => a + b, 0) / this.tickHistory.length;
            const max = Math.max(...this.tickHistory);

            // Basic histogram buckets
            const buckets = [0.1, 0.5, 1, 2, 5, 10, 20];
            const counts = new Array(buckets.length + 1).fill(0);
            for (const d of this.tickHistory) {
                let placed = false;
                for (let i = 0; i < buckets.length; i++) {
                    if (d <= buckets[i]) {
                        counts[i]++;
                        placed = true;
                        break;
                    }
                }
                if (!placed) counts[buckets.length]++;
            }

            const event: SimulationEvent = {
                type: 'metrics:performance',
                tick: this.currentTick,
                data: {
                    lastMs: durationMs,
                    avgMs: avg,
                    maxMs: max,
                    histogram: buckets.map((b, i) => ({ limit: b, count: counts[i] })),
                    overflow: counts[buckets.length],
                    phases: phaseTimes
                }
            };

            this.events.emit(event);
        }
    }

    private resolveCommands(queue: Command[]): void {
        if (queue.length > 0) {
            //console.log(`[World] Resolving ${queue.length} commands for tick ${this.currentTick}`);
        }
        for (const cmd of queue) {
            // console.log(`  - Dispatching: ${cmd.constructor.name} for ${cmd.entityId}`);
            this.tracer.record(this.currentTick, cmd);
            this.dispatcher.dispatch(cmd, this);
        }
    }

    public getTickCount(): number {
        return this.currentTick;
    }

    /**
     * toJSON: Serializes the entire world state.
     */
    public toJSON(): WorldState {
        const entitiesData = [];
        for (const entity of this.entities.values()) {
            entitiesData.push({
                id: entity.id,
                side: entity.side,
                parentId: entity.parentEntityId,
                components: entity.getAllComponents().map(c => ({
                    type: c.constructor.name,
                    data: { ...c }
                }))
            });
        }

        const json: WorldState = {
            currentTick: this.currentTick,
            entities: entitiesData
        };
        return WorldStateSchema.parse(json);
    }

    /**
     * fromJSON: Hydrates a world from serialized data.
     */
    public static fromJSON(data: any): World {
        const world = new World();
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

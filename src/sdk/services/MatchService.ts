import { World } from '../../engine/core/World.js';
import { Side } from '../../engine/core/Types.js';
import { ProfileRegistry } from '../../engine/core/ProfileRegistry.js';
import { EntityManager } from '../../engine/core/EntityManager.js';
import { ScenarioLoader, ScenarioManifest } from '../../engine/core/ScenarioLoader.js';
import { PhysicsSystem } from '../../engine/systems/PhysicsSystem.js';
import { SensorSystem } from '../../engine/systems/SensorSystem.js';
import { GuidanceSystem } from '../../engine/systems/GuidanceSystem.js';
import { CombatSystem } from '../../engine/systems/CombatSystem.js';
import { TerrainOracle } from '../../engine/environment/TerrainOracle.js';
import { GeoProjection } from '../../engine/math/GeoProjection.js';
import { DatalinkSystem } from '../../engine/systems/DatalinkSystem.js';
import { EnvironmentSystem } from '../../engine/systems/EnvironmentSystem.js';
import { AeroSystem } from '../../engine/systems/AeroSystem.js';
import { CollisionSystem } from '../../engine/systems/CollisionSystem.js';
import { WeaponStageSystem } from '../../engine/systems/WeaponStageSystem.js';
import { ViewStateSystem } from '../../engine/systems/ViewStateSystem.js';
import { TMSSystem } from '../../engine/systems/TMSSystem.js';
import { DoctrineSystem } from '../../engine/systems/DoctrineSystem.js';
import { BoardingSystem } from '../../engine/systems/BoardingSystem.js';
import { MineTriggerSystem } from '../../engine/systems/MineTriggerSystem.js';
import { TaskReconcilerSystem } from '../../engine/systems/TaskReconcilerSystem.js';
import { WaypointSystem } from '../../engine/systems/WaypointSystem.js';
import { FormationSystem } from '../../engine/systems/FormationSystem.js';
import { CommissarSystem } from '../../engine/systems/CommissarSystem.js';
import { MissionSystem } from '../../engine/systems/MissionSystem.js';
import { PropulsionSystem } from '../../engine/systems/PropulsionSystem.js';
import { LogisticsSystem } from '../../engine/systems/LogisticsSystem.js';
import { ControlSystem } from '../../engine/systems/ControlSystem.js';
import { WeaponProfileRegistry } from '../../engine/core/WeaponProfileRegistry.js';
import { TelemetrySystem } from '../../engine/systems/TelemetrySystem.js';
import { bootstrapComponents } from '../../engine/core/ComponentBootstrap.js';
import { WRAExecutorSystem } from '../../engine/systems/WRAExecutorSystem.js';
import { MapDataService } from '../../engine/environment/MapDataService.js';
import { ScenarioAutomationSystem } from '../../engine/systems/ScenarioAutomationSystem.js';
import { MissileHomingSystem } from '../../engine/systems/MissileHomingSystem.js';
import * as demoData from '../../data/index.js';

import { TerrainService } from './TerrainService.js';
import { ServiceConfig, IStorageProvider, ILogger } from './types.js';

/**
 * MatchService: Orchestrates Engine V3 instances.
 * In V3, we start with a single-process model for stability, then scale to workers.
 */
export class MatchService {
    private readonly matches = new Map<string, World>();
    private readonly profiles = new ProfileRegistry();
    private readonly weaponProfiles = new WeaponProfileRegistry();
    private readonly mapData = new MapDataService();
    public readonly terrainService: TerrainService;
    public globalWorld: World;
    private broadcastCallback?: (matchId: string, snapshot: any) => void;
    private eventCallback?: (matchId: string, event: any) => void;
    private onMatchTimeChanged?: (matchId: string, rate: number, paused: boolean) => void;
    private onMatchCreated?: (matchId: string) => void;
    private onMatchDeleted?: (matchId: string) => void;

    private readonly storage: IStorageProvider;
    private readonly logger: ILogger;
    private readonly baseDir: string;

    constructor(config: ServiceConfig) {
        this.storage = config.storage;
        this.logger = config.logger;
        this.baseDir = config.baseDir || '';

        this.terrainService = new TerrainService(config);

        bootstrapComponents();

        // 1. Load Type-Safe Demo Profiles
        for (const [id, profile] of Object.entries(demoData.profiles)) {
            this.profiles.register(id, profile);
        }

        this.mapData.loadAll();
        this.globalWorld = new World(undefined, undefined, this.profiles, this.weaponProfiles);
        this.matches.set('default', this.globalWorld);

        this.initializeWorldSystems(this.globalWorld);
        this.setupEventBus('default', this.globalWorld);

        // Register Core Weapons from Demo Data
        this.registerWeaponProfiles();
    }

    public async init() {
        await this.terrainService.init();
        await this.loadDatabase();
        this.logger.info(`MatchService initialized with ${Object.keys(demoData.profiles).length} platform and ${demoData.weaponProfiles.length} weapon profiles.`);
    }

    public setMatchTime(matchId: string, rate: number, paused: boolean) {
        const world = this.getMatch(matchId);
        if (world) {
            world.clock.setCompression(rate);
            world.clock.setPaused(paused);
            if (this.onMatchTimeChanged) {
                this.onMatchTimeChanged(matchId, rate, paused);
            }
        }
    }

    public setOnMatchTimeChanged(cb: (matchId: string, rate: number, paused: boolean) => void) {
        this.onMatchTimeChanged = cb;
    }


    public setBroadcastCallback(cb: (matchId: string, snapshot: any) => void) {
        this.broadcastCallback = cb;
    }

    public setOnMatchCreated(cb: (matchId: string) => void) { this.onMatchCreated = cb; }
    public setOnMatchDeleted(cb: (matchId: string) => void) { this.onMatchDeleted = cb; }

    public setEventCallback(cb: (matchId: string, event: any) => void) {
        this.eventCallback = cb;
    }

    public updateGlobalWorld(newWorld: World) {
        this.globalWorld = newWorld;
        this.matches.set('default', newWorld);
        this.setupEventBus('default', newWorld);
        this.logger.info('Global world replaced and synchronized in MatchService');
    }

    public registerProfile(id: string, profile: any) {
        this.profiles.register(id, profile);
        // Also update global world for immediate effect if needed
        this.globalWorld.profileRegistry.register(id, profile);
    }

    public setupEventBus(matchId: string, world: World): void {
        console.log(`MatchService: setupEventBus for match ${matchId}`);
        world.events.on('TacticalEvent', (event: any) => {
            if (this.eventCallback) this.eventCallback(matchId, { type: event.data.type || 'tactical', ...event.data });
        });

        const relayEvents = ['WeaponFired', 'Impact', 'EntityDestroyed', 'Detonation', 'BoardingStarted', 'EntitySideChanged'];
        relayEvents.forEach(type => {
            world.events.on(type, (event: any) => {
                if (this.eventCallback) this.eventCallback(matchId, { type, ...event });
            });
        });

        world.events.on('ViewStateUpdated', (evt: any) => {
            if (this.broadcastCallback) {
                this.broadcastCallback(matchId, evt.data);
            } else {
                console.warn(`MatchService: No broadcast callback set for match ${matchId}`);
            }
        });

        world.events.on('metrics:performance', (data: any) => {
            if (this.eventCallback) this.eventCallback(matchId, { type: 'PERFORMANCE_METRICS', ...data });
        });
    }

    public initializeWorldSystems(world: World): void {
        const terrain = new TerrainOracle(this.terrainService);
        const projection = new GeoProjection();

        world.addSystem(new EnvironmentSystem(terrain, projection));
        world.addSystem(new SensorSystem(terrain, projection));
        world.addSystem(new DoctrineSystem());
        world.addSystem(new BoardingSystem());
        world.addSystem(new MineTriggerSystem());
        world.addSystem(new GuidanceSystem());
        world.addSystem(new MissileHomingSystem());
        world.addSystem(new WRAExecutorSystem(this.weaponProfiles));
        world.addSystem(new CombatSystem(this.weaponProfiles));
        world.addSystem(new TelemetrySystem());
        world.addSystem(new AeroSystem());
        world.addSystem(new WeaponStageSystem());
        world.addSystem(new PhysicsSystem());
        world.addSystem(new TMSSystem());
        world.addSystem(new WaypointSystem());
        world.addSystem(new FormationSystem());
        world.addSystem(new CommissarSystem());
        world.addSystem(new MissionSystem());
        world.addSystem(new DatalinkSystem());
        world.addSystem(new TaskReconcilerSystem());
        world.addSystem(new PropulsionSystem());
        world.addSystem(new LogisticsSystem());
        world.addSystem(new ControlSystem());
        world.addSystem(new ScenarioAutomationSystem());
        world.addSystem(new CollisionSystem(world.grid));
        world.addSystem(new ViewStateSystem(projection, terrain, this.weaponProfiles, this.mapData));

        console.log("Initialized all systems in MatchService");
    }

    private registerWeaponProfiles(): void {
        for (const profile of demoData.weaponProfiles) {
            this.weaponProfiles.register(profile.id, profile);
        }
    }

    public async createMatch(matchId: string, manifest?: ScenarioManifest): Promise<World> {
        this.logger.info(`Creating Match: ${matchId}`, { scenario: manifest?.name || 'Empty' });

        const world = new World(undefined, undefined, this.profiles, this.weaponProfiles);
        this.initializeWorldSystems(world);
        this.setupEventBus(matchId, world);
        this.matches.set(matchId, world);
        if (this.onMatchCreated) this.onMatchCreated(matchId);

        if (manifest) {
            const entityMgr = new EntityManager(world, this.profiles);
            const loader = new ScenarioLoader(entityMgr);

            // Set Origin
            if (manifest.origin) {
                const env = world.getSystem(EnvironmentSystem);
                const vs = world.getSystem(ViewStateSystem);
                if (env) env.setOrigin(manifest.origin.lat, manifest.origin.lon);
                if (vs) vs.setOrigin(manifest.origin.lat, manifest.origin.lon);
            }

            loader.load(manifest);
        }

        return world;
    }

    public getMatch(matchId: string): World | undefined {
        return this.matches.get(matchId);
    }

    public deleteMatch(matchId: string): void {
        this.matches.delete(matchId);
        if (this.onMatchDeleted) this.onMatchDeleted(matchId);
    }

    /**
     * tickAll: Global heartbeat for all active matches.
     */
    public async tickAll(dt: number): Promise<void> {
        const tickPromises = [];
        for (const world of this.matches.values()) {
            tickPromises.push(world.tick(dt));
        }
        await Promise.all(tickPromises);
    }

    /**
     * getInitialState: Generates a hydration snapshot for a new session.
     */
    public async getInitialState(matchId: string, side: Side): Promise<any> {
        const world = this.getMatch(matchId);
        if (!world) return null;
        const vss = world.getSystem<any>('ViewStateSystem');
        return vss ? await vss.generateSnapshot(world, side) : null;
    }

    public getProfileDatabase(): any {
        return {
            units: Array.from((this.profiles as any).profiles.entries()),
            weapons: Array.from((this.weaponProfiles as any).profiles.entries())
        };
    }

    private async loadDatabase(): Promise<void> {
        const unitsDir = this.storage.join(this.baseDir, 'data/db3000/units');
        if (await this.storage.exists(unitsDir)) {
            const files = await this.storage.readdir(unitsDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const id = file.replace('.json', '');
                    const filePath = this.storage.join(unitsDir, file);
                    try {
                        const content = await this.storage.readFile(filePath, 'utf8') as string;
                        this.profiles.register(id, JSON.parse(content));
                        this.logger.info(`Registered Unit Profile: ${id}`);
                    } catch (err) {
                        this.logger.error(`Failed to register unit profile: ${id}`, { error: err });
                    }
                }
            }
        }
    }
}

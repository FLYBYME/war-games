import { World } from '../../engine/core/World.js';
import { Side, ViewStateSnapshot, SimulationEvent, MatchInfo, EntityProfile, WeaponProfile } from '../../engine/core/Types.js';
import { HealthComponent } from '../../engine/components/Health.js';
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
import { EntityProfileSchema } from '../../sdk/schemas/index.js';

import { TerrainService } from './TerrainService.js';
import { MatchRecorder } from '../core/MatchRecorder.js';
import { ServiceConfig, IStorageProvider, ILogger } from './types.js';

/**
 * MatchService: Orchestrates Engine V3 instances.
 */
export class MatchService {
    private readonly matches = new Map<string, World>();
    private readonly profiles = new ProfileRegistry();
    private readonly weaponProfiles = new WeaponProfileRegistry();
    private readonly mapData = new MapDataService();
    public readonly terrainService: TerrainService;
    public globalWorld: World;
    private readonly recorder: MatchRecorder;
    private broadcastCallback?: (matchId: string, snapshot: ViewStateSnapshot) => void;
    private eventCallback?: (matchId: string, event: SimulationEvent) => void;
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
        this.recorder = new MatchRecorder(this.storage, this.logger, this.baseDir);

        bootstrapComponents();

        for (const [id, profile] of Object.entries(demoData.profiles)) {
            try {
                this.profiles.register(id, EntityProfileSchema.parse(profile));
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                this.logger.error(`Failed to parse demo profile ${id}: ${message}`);
            }
        }

        this.globalWorld = new World(undefined, undefined, this.profiles, this.weaponProfiles);
        this.matches.set('default', this.globalWorld);

        this.initializeWorldSystems(this.globalWorld);
        this.setupEventBus('default', this.globalWorld);

        this.registerWeaponProfiles();
    }

    public async init() {
        await this.mapData.loadAll();
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

    public setBroadcastCallback(cb: (matchId: string, snapshot: ViewStateSnapshot) => void) {
        this.broadcastCallback = cb;
    }

    public setOnMatchCreated(cb: (matchId: string) => void) { this.onMatchCreated = cb; }
    public setOnMatchDeleted(cb: (matchId: string) => void) { this.onMatchDeleted = cb; }

    public setEventCallback(cb: (matchId: string, event: SimulationEvent) => void) {
        this.eventCallback = cb;
    }

    public updateGlobalWorld(newWorld: World) {
        this.globalWorld = newWorld;
        this.matches.set('default', newWorld);
        this.setupEventBus('default', newWorld);
        this.logger.info('Global world replaced and synchronized in MatchService');
    }

    public registerMatch(matchId: string, world: World) {
        this.matches.set(matchId, world);
        this.setupEventBus(matchId, world);
        if (this.onMatchCreated) this.onMatchCreated(matchId);
    }

    public registerProfile(id: string, profile: EntityProfile) {
        this.profiles.register(id, profile);
        this.globalWorld.profileRegistry.register(id, profile);
    }

    public setupEventBus(matchId: string, world: World): void {
        world.events.onAny((event: SimulationEvent) => {
            if (this.eventCallback) this.eventCallback(matchId, event);
            void this.recorder.recordEvent(matchId, event);

            if (event.type === 'SimulationSpeedChanged') {
                const data = event.data as { timeCompression: number; isPaused: boolean };
                if (this.onMatchTimeChanged) {
                    this.onMatchTimeChanged(matchId, data.timeCompression, data.isPaused);
                }
            }
        });

        const vss = world.getSystem(ViewStateSystem);
        if (vss) {
            world.events.on('ViewStateUpdated', (evt: unknown) => {
                if (this.broadcastCallback) {
                    if (evt && typeof evt === 'object' && 'data' in evt) {
                        this.broadcastCallback(matchId, (evt as { data: ViewStateSnapshot }).data);
                    }
                }
            });
        }
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
        world.addSystem(new ViewStateSystem(projection, terrain, this.profiles, this.weaponProfiles, this.mapData));
    }

    private registerWeaponProfiles(): void {
        for (const profile of demoData.weaponProfiles) {
            this.weaponProfiles.register(profile.id, profile);
        }
    }

    public async createMatch(matchId: string, manifest?: ScenarioManifest): Promise<World> {
        this.logger.info(`Creating Match: ${matchId}`, { scenario: manifest?.name || 'Empty' });

        const world = new World(undefined, undefined, this.profiles, this.weaponProfiles);
        world.isPaused = true;
        this.initializeWorldSystems(world);
        this.setupEventBus(matchId, world);
        this.matches.set(matchId, world);
        if (this.onMatchCreated) this.onMatchCreated(matchId);

        if (manifest) {
            const entityMgr = new EntityManager(world, this.profiles);
            const loader = new ScenarioLoader(entityMgr);

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

    public listMatches(): MatchInfo[] {
        return Array.from(this.matches.entries()).map(([id, world]) => ({
            id,
            tick: world.currentTick,
            entityCount: Array.from(world.getEntities()).length,
            isPaused: world.clock.isPaused,
            timeCompression: world.clock.timeCompression
        }));
    }

    public getWinState(matchId: string): { over: boolean; winner?: string; reason?: string } {
        const world = this.getMatch(matchId);
        if (!world) return { over: false };

        const entities = Array.from(world.getEntities());
        if (entities.length === 0) return { over: false };

        const redUnits = entities.filter(e => e.side === Side.Red && e.hasComponent(HealthComponent));
        const blueUnits = entities.filter(e => e.side === Side.Blue && e.hasComponent(HealthComponent));

        const redCombatants = redUnits.filter(e => {
            const pid = e.profileId?.toLowerCase() || '';
            return !pid.includes('projectile') && !pid.includes('missile') && !pid.includes('torpedo') && !pid.includes('sonobuoy');
        });
        const blueCombatants = blueUnits.filter(e => {
            const pid = e.profileId?.toLowerCase() || '';
            return !pid.includes('projectile') && !pid.includes('missile') && !pid.includes('torpedo') && !pid.includes('sonobuoy');
        });

        if (world.currentTick > 0) {
            if (redCombatants.length === 0 && blueCombatants.length > 0) {
                return { over: true, winner: 'Blue', reason: 'All Red units destroyed' };
            }
            if (blueCombatants.length === 0 && redCombatants.length > 0) {
                return { over: true, winner: 'Red', reason: 'All Blue units destroyed' };
            }
            if (redCombatants.length === 0 && blueCombatants.length === 0) {
                return { over: true, winner: 'None', reason: 'Mutual destruction' };
            }
        }

        return { over: false };
    }

    public getRecentEvents(matchId: string, count: number = 50): SimulationEvent[] {
        const world = this.getMatch(matchId);
        if (!world) return [];
        const tel = world.getSystem(TelemetrySystem);
        return (tel ? tel.getRecentEvents(count) : []) as SimulationEvent[];
    }

    public getProfile(id: string): EntityProfile | undefined {
        return this.profiles.get(id);
    }

    public getStats(): { totalMatches: number; totalEntities: number; profilesCount: number; weaponProfilesCount: number } {
        const matches = Array.from(this.matches.values());
        return {
            totalMatches: matches.length,
            totalEntities: matches.reduce((acc, world) => acc + Array.from(world.getEntities()).length, 0),
            profilesCount: this.profiles.list().length,
            weaponProfilesCount: this.weaponProfiles.list().length
        };
    }

    public deleteMatch(matchId: string): void {
        void this.recorder.finalize(matchId);
        this.matches.delete(matchId);
        if (this.onMatchDeleted) this.onMatchDeleted(matchId);
    }

    public async getTelemetry(matchId: string): Promise<Record<string, unknown[]>> {
        const world = this.getMatch(matchId);
        if (!world) return {};
        const tel = world.getSystem(TelemetrySystem);
        return tel ? { events: tel.getRecentEvents(1000) } : {};
    }

    public async tickAll(dt: number): Promise<void> {
        const tickPromises: Promise<void>[] = [];
        this.matches.forEach(world => {
            tickPromises.push(world.tick(dt));
        });
        await Promise.all(tickPromises);
    }

    public async getInitialState(matchId: string, side: Side): Promise<ViewStateSnapshot | null> {
        const world = this.getMatch(matchId);
        if (!world) return null;
        const vss = world.getSystem(ViewStateSystem);
        return vss ? await vss.generateSnapshot(world, side) : null;
    }

    public getProfileDatabase(): { units: [string, EntityProfile][], weapons: [string, WeaponProfile][] } {
        return {
            units: Array.from(this.profiles.getInternalMap().entries()),
            weapons: Array.from(this.weaponProfiles.getInternalMap().entries())
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
                        const profile = EntityProfileSchema.parse(JSON.parse(content));
                        this.profiles.register(id, profile);
                        this.logger.info(`Registered Unit Profile: ${id}`);
                    } catch (err: unknown) {
                        const message = err instanceof Error ? err.message : String(err);
                        this.logger.error(`Failed to register unit profile: ${id}`, { error: message });
                    }
                }
            }
        }
    }
}

import { IMatchService, IMatchHandle } from '../core/tool_builder.js';
import { World } from '../../engine/core/World.js';
import { ScenarioLoader } from '../../engine/core/ScenarioLoader.js';
import { EntityManager } from '../../engine/core/EntityManager.js';
import { db } from '../db/db.js';
import { scenarios, matches } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { ScenarioManifestSchema } from '../../sdk_v2/contracts/index.js';
import { TerrainService } from './TerrainService.js';
import { TerrainServiceAdapter } from './TerrainServiceAdapter.js';
import { TerrainOracle } from '../../engine/environment/TerrainOracle.js';
import { GeoProjection } from '../../engine/math/GeoProjection.js';

// Import Systems
import { AeroSystem } from '../../engine/systems/AeroSystem.js';
import { CollisionSystem } from '../../engine/systems/CollisionSystem.js';
import { CombatSystem } from '../../engine/systems/CombatSystem.js';
import { DamageDegradationSystem } from '../../engine/systems/DamageDegradationSystem.js';
import { DatalinkSystem } from '../../engine/systems/DatalinkSystem.js';
import { DoctrineSystem } from '../../engine/systems/DoctrineSystem.js';
import { EnvironmentSystem } from '../../engine/systems/EnvironmentSystem.js';
import { FormationSystem } from '../../engine/systems/FormationSystem.js';
import { GuidanceSystem } from '../../engine/systems/GuidanceSystem.js';
import { HealthSystem } from '../../engine/systems/HealthSystem.js';
import { MissionSystem } from '../../engine/systems/MissionSystem.js';
import { PhysicsSystem } from '../../engine/systems/PhysicsSystem.js';
import { PropulsionSystem } from '../../engine/systems/PropulsionSystem.js';
import { SensorSystem } from '../../engine/systems/SensorSystem.js';
import { TelemetrySystem } from '../../engine/systems/TelemetrySystem.js';
import { TrackManagementSystem } from '../../engine/systems/TrackManagementSystem.js';
import { WaypointSystem } from '../../engine/systems/WaypointSystem.js';
import { WeaponStageSystem } from '../../engine/systems/WeaponStageSystem.js';
import { WRAExecutorSystem } from '../../engine/systems/WRAExecutorSystem.js';

/**
 * MatchHandle: Concrete implementation of a live simulation match.
 */
export class MatchHandle implements IMatchHandle {
    public readonly world: World;
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly scenarioId: string,
        terrainService?: TerrainService
    ) {
        this.world = new World();
        
        // Initialize Systems with dependencies
        const projection = new GeoProjection();
        let oracle: TerrainOracle;
        
        if (terrainService) {
            const provider = new TerrainServiceAdapter(terrainService);
            oracle = new TerrainOracle(provider);
        } else {
            oracle = new TerrainOracle(); // Null provider returns 0 elevation
        }

        // Registry the core perception/action loop
        this.world.addSystem(new EnvironmentSystem(oracle, projection));
        this.world.addSystem(new DoctrineSystem());
        this.world.addSystem(new MissionSystem());
        this.world.addSystem(new WaypointSystem());
        this.world.addSystem(new FormationSystem());
        
        this.world.addSystem(new SensorSystem(oracle, projection));
        this.world.addSystem(new TrackManagementSystem());
        this.world.addSystem(new DatalinkSystem());
        
        this.world.addSystem(new PropulsionSystem());
        this.world.addSystem(new AeroSystem());
        this.world.addSystem(new GuidanceSystem());
        this.world.addSystem(new WeaponStageSystem());
        this.world.addSystem(new PhysicsSystem());
        
        this.world.addSystem(new CollisionSystem(this.world.grid));
        this.world.addSystem(new HealthSystem());
        this.world.addSystem(new DamageDegradationSystem());
        
        this.world.addSystem(new CombatSystem(this.world.weaponProfiles));
        this.world.addSystem(new WRAExecutorSystem(this.world.weaponProfiles));
        
        this.world.addSystem(new TelemetrySystem());
    }

    public get isPaused(): boolean { return this.world.isPaused; }
    public set isPaused(val: boolean) { this.world.isPaused = val; }
    public get timeCompression(): number { return this.world.timeCompression; }
    public set timeCompression(val: number) { this.world.clock.timeCompression = val; }

    get currentTick(): number {
        return this.world.currentTick;
    }
}

export function isMatchHandle(handle: IMatchHandle): handle is MatchHandle {
    return handle instanceof MatchHandle;
}

/**
 * MatchService: Manages the lifecycle of all active simulation matches.
 */
export class MatchService implements IMatchService {
    private activeMatches = new Map<string, MatchHandle>();
    private runnerInterval: NodeJS.Timeout | null = null;

    constructor(private terrainService?: TerrainService) {
        this.startRunner();
    }

    public getMatch(matchId: string): MatchHandle {
        const match = this.activeMatches.get(matchId);
        if (!match) throw new Error(`Match not found: ${matchId}`);
        return match;
    }

    public listMatches(): MatchHandle[] {
        return Array.from(this.activeMatches.values());
    }

    public async createMatch(scenarioId: string, name: string): Promise<MatchHandle> {
        const scenario = await db.query.scenarios.findFirst({
            where: eq(scenarios.id, scenarioId)
        });

        if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);

        const matchId = randomUUID();
        const handle = new MatchHandle(matchId, name, scenarioId, this.terrainService);

        const entityMgr = new EntityManager(handle.world, handle.world.profileRegistry);
        const loader = new ScenarioLoader(entityMgr);
        
        const manifest = ScenarioManifestSchema.parse(scenario.manifest);
        loader.load(manifest);

        this.activeMatches.set(matchId, handle);

        db.insert(matches).values({
            id: matchId,
            name,
            scenarioId,
            status: 'running',
            createdAt: new Date(),
            updatedAt: new Date()
        }).run();

        return handle;
    }

    public deleteMatch(matchId: string): boolean {
        const deleted = this.activeMatches.delete(matchId);
        if (deleted) {
            db.update(matches)
                .set({ status: 'completed', updatedAt: new Date() })
                .where(eq(matches.id, matchId))
                .run();
        }
        return deleted;
    }

    private startRunner() {
        if (this.runnerInterval) return;

        this.runnerInterval = setInterval(async () => {
            for (const match of this.activeMatches.values()) {
                if (!match.isPaused) {
                    try {
                        await match.world.tick(0.1);
                    } catch (err) {
                        console.error(`Simulation Tick Error in match ${match.id}:`, err);
                    }
                }
            }
        }, 100);
    }

    public stopRunner() {
        if (this.runnerInterval) {
            clearInterval(this.runnerInterval);
            this.runnerInterval = null;
        }
    }
}

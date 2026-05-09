import { IMatchService, IMatchHandle } from '../core/tool_builder.js';
import { World } from '../../engine/core/World.js';
import { ScenarioLoader } from '../../engine/core/ScenarioLoader.js';
import { EntityManager } from '../../engine/core/EntityManager.js';
import { db } from '../db/db.js';
import { scenarios, matches } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * MatchHandle: Concrete implementation of a live simulation match.
 * Wraps an ECS World instance and provides metadata.
 */
export class MatchHandle implements IMatchHandle {
    public readonly world: World;
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly scenarioId: string
    ) {
        this.world = new World();
    }

    public get isPaused(): boolean { return this.world.isPaused; }
    public set isPaused(val: boolean) { this.world.isPaused = val; }
    public get timeCompression(): number { return this.world.timeCompression; }
    public set timeCompression(val: number) { this.world.clock.timeCompression = val; }

    get currentTick(): number {
        return this.world.currentTick;
    }
}

import { ScenarioManifestSchema } from '../../sdk_v2/contracts/index.js';

/**
 * Type guard to safely narrow IMatchHandle to concrete MatchHandle.
 */
export function isMatchHandle(handle: IMatchHandle): handle is MatchHandle {
    return handle instanceof MatchHandle;
}

/**
 * MatchService: Manages the lifecycle of all active simulation matches.
 */
export class MatchService implements IMatchService {
    private activeMatches = new Map<string, MatchHandle>();
    private runnerInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.startRunner();
    }

    /**
     * Retrieves an active match by its ID.
     */
    public getMatch(matchId: string): MatchHandle {
        const match = this.activeMatches.get(matchId);
        if (!match) throw new Error(`Match not found: ${matchId}`);
        return match;
    }

    /**
     * Lists all currently active matches.
     */
    public listMatches(): MatchHandle[] {
        return Array.from(this.activeMatches.values());
    }

    /**
     * Creates a new match from a scenario template.
     */
    public async createMatch(scenarioId: string, name: string): Promise<MatchHandle> {
        // 1. Fetch scenario from DB
        const scenario = await db.query.scenarios.findFirst({
            where: eq(scenarios.id, scenarioId)
        });

        if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);

        const matchId = randomUUID();
        const handle = new MatchHandle(matchId, name, scenarioId);

        // 2. Load scenario into world
        const entityMgr = new EntityManager(handle.world, handle.world.profileRegistry);
        const loader = new ScenarioLoader(entityMgr);
        
        // Use Zod to safely parse the manifest from the DB
        const manifest = ScenarioManifestSchema.parse(scenario.manifest);
        loader.load(manifest);

        this.activeMatches.set(matchId, handle);

        // 3. Save match metadata to DB
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

    /**
     * Deletes/Stops a match and updates its status in the DB.
     */
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

    /**
     * Starts the global simulation runner loop.
     */
    private startRunner() {
        if (this.runnerInterval) return;

        // Simulation runner: 100ms interval
        // Steps the simulation world at a base rate of 10Hz
        this.runnerInterval = setInterval(async () => {
            for (const match of this.activeMatches.values()) {
                if (!match.isPaused) {
                    try {
                        // World.tick is async due to some system logic
                        await match.world.tick(0.1);
                    } catch (err) {
                        console.error(`Simulation Tick Error in match ${match.id}:`, err);
                    }
                }
            }
        }, 100);
    }

    /**
     * Stops the global simulation runner loop.
     */
    public stopRunner() {
        if (this.runnerInterval) {
            clearInterval(this.runnerInterval);
            this.runnerInterval = null;
        }
    }
}

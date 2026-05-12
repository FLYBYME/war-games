import { IMatchService, IMatchHandle, ToolContext, IServerApp } from '../../../server_v2/core/tool_builder.js';
import { IWorldView } from '../../../engine/core/ISystem.js';
import { vi } from 'vitest';

/**
 * Creates a mock Entity.
 */
export function createMockEntity(id: string, side: string = 'Blue'): any {
    const components = new Map<string, any>();
    
    return {
        id,
        side,
        profileId: 'mock-profile',
        addComponent: vi.fn((c: any) => {
            components.set(c.type, c);
        }),
        getComponent: vi.fn((ctor: any) => {
            return components.get(ctor.name);
        }),
        getAllComponents: vi.fn(() => Array.from(components.values()))
    };
}

/**
 * Creates a mock MatchHandle.
 */
export function createMockMatchHandle(overrides: Partial<IMatchHandle> = {}): IMatchHandle {
    const entities = new Map<string, any>();
    
    let tickValue = 0;
    const world: any = {
        get currentTick() { return tickValue; },
        set currentTick(v: number) { tickValue = v; },
        timestamp: 0,
        isPaused: false,
        stats: {
            blue: 0,
            red: 0,
            munitionsExpended: 0
        },
        profileRegistry: {
            get: vi.fn(() => ({ id: 'mock-profile', type: 'Aircraft', health: { maxHp: 100 } })),
            register: vi.fn()
        } as any,
        weaponProfiles: {
            get: vi.fn()
        } as any,
        events: {
            emit: vi.fn(),
            on: vi.fn(),
            onAny: vi.fn(),
            offAny: vi.fn()
        } as any,
        getEntity: vi.fn((id: string) => entities.get(id)),
        getEntities: vi.fn(() => entities.values()),
        getNearbyEntities: vi.fn(() => []),
        addEntity: vi.fn((e: any) => entities.set(e.id, e)),
        removeEntity: vi.fn((id: string) => entities.delete(id)),
        getSystem: vi.fn((ctor: any) => {
            if (ctor.name === 'ScenarioAutomationSystem') {
                return {
                    getPendingEvents: vi.fn(() => []),
                    getTriggeredEvents: vi.fn(() => []),
                    getResults: vi.fn(() => []),
                    triggerEvent: vi.fn(() => true)
                };
            }
            return {
                getProjection: vi.fn(() => ({
                    project: vi.fn((pos: any) => ({ lat: pos.x, lon: pos.y })),
                    unproject: vi.fn((lat: number, lon: number) => ({ x: lat, y: lon, z: 0 }))
                }))
            };
        }) as any,
        recordEvent: vi.fn(),
        random: {
            integer: vi.fn(() => Math.floor(Math.random() * 1000000))
        } as any,
        getTracerSize: vi.fn(() => 0),
        getOctreeNodeCount: vi.fn(() => 0),
        tick: vi.fn(async (_dt: number) => { tickValue++; }),
        step: vi.fn(async () => { tickValue++; })
    };

    const handle: IMatchHandle = {
        id: 'mock-match-id',
        name: 'Mock Match',
        scenarioId: 'mock-scenario-id',
        isPaused: false,
        currentTick: 0,
        timeCompression: 1,
        world,
        flush: vi.fn(async () => {}),
        ...overrides
    };
    
    return handle;
}

/**
 * Creates a mock MatchService.
 */
export function createMockMatchService(matches: IMatchHandle[] = []): IMatchService {
    return {
        getMatch: vi.fn((id: string) => {
            const match = matches.find(m => m.id === id);
            if (!match) throw new Error(`Match not found: ${id}`);
            return match;
        }),
        listMatches: vi.fn(() => matches),
        createMatch: vi.fn(async (scenarioId: string, name: string) => 
            createMockMatchHandle({ scenarioId, name })
        ),
        deleteMatch: vi.fn(() => true)
    };
}

/**
 * Creates a mock ToolContext.
 */
export function createMockContext(matchService: IMatchService): ToolContext {
    const app: IServerApp = {
        matchService,
        terrainService: {
            getElevation: vi.fn(async () => 100),
            getElevationProfile: vi.fn(async (_sLat: number, _sLon: number, _eLat: number, _eLon: number, points: number) => new Array(points).fill(100)),
            getTile: vi.fn(async () => ({ resolution: 1201, data: new Float32Array(1201 * 1201) })),
            getCacheStats: vi.fn(() => ({ cachedTiles: 0, activeJobs: 0 })),
            clearCache: vi.fn(),
            shutdown: vi.fn()
        } as any,
        workerService: {
            createPool: vi.fn(),
            getPool: vi.fn(() => ({ 
                execute: vi.fn(async () => ({})),
                getStats: vi.fn(() => ({ poolName: 'mock', workerCount: 0, activeJobs: 0, queuedJobs: 0, workers: [] }))
            })),
            listPools: vi.fn(() => []),
            shutdown: vi.fn()
        } as any,
        agentService: {
            createAgent: vi.fn(),
            listAgents: vi.fn(),
            createThread: vi.fn(),
            getThreadHistory: vi.fn(),
            runAgentStream: vi.fn()
        } as any,
        log: {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn()
        }
    };

    return {
        app
    };
}

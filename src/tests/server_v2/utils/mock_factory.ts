import { IMatchService, IMatchHandle, ToolContext, IServerApp } from '../core/tool_builder.js';
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
    
    const handle = {
        id: 'mock-match-id',
        name: 'Mock Match',
        scenarioId: 'mock-scenario-id',
        isPaused: false,
        currentTick: 0,
        timeCompression: 1,
        ...overrides
    };
    
    // Add a mock world for tools that expect it on concrete handles
    (handle as any).world = {
        stats: {
            blue: 0,
            red: 0,
            munitionsExpended: 0
        },
        profileRegistry: {
            get: vi.fn(() => ({ id: 'mock-profile', type: 'Aircraft', health: { maxHp: 100 } }))
        },
        addEntity: vi.fn((e: any) => {
            entities.set(e.id, e);
        }),
        getEntity: vi.fn((id: string) => entities.get(id)),
        getEntities: vi.fn(() => entities.values()),
        random: {
            integer: vi.fn(() => Math.floor(Math.random() * 1000000))
        }
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
        } as any
    };
    return {
        app
    };
}

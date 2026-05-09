import { IMatchService, IMatchHandle, ToolContext, IServerApp } from '../core/tool_builder.js';
import { vi } from 'vitest';

/**
 * Creates a mock MatchHandle.
 */
export function createMockMatchHandle(overrides: Partial<IMatchHandle> = {}): IMatchHandle {
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
        matchService
    };
    return {
        app
    };
}

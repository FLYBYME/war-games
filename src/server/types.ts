import { MatchService } from './services/MatchService.js';
import { ScenarioService } from './services/ScenarioService.js';
import { TerrainService } from './services/TerrainService.js';
import { SessionManager } from './core/SessionManager.js';
import { WebSocket } from 'ws';
import { Side, ViewStateSnapshot } from '../engine/core/Types.js';
import { BugManager } from './core/BugManager.js';

export interface ManagedWebSocket extends WebSocket {
    isAlive?: boolean;
}

export interface ClientSession {
    id: string;
    ws: ManagedWebSocket;
    side?: Side;
    matchId?: string;
    lastPing: number;
    send: (data: unknown) => void;
    syncRateHz?: number;
    fullSyncIntervalMs?: number;
    lastSyncTime?: number;
    lastFullSyncTime?: number;
}

declare module 'fastify' {
    interface FastifyInstance {
        matchService: MatchService;
        scenarioService: ScenarioService;
        sessionManager: SessionManager;
        terrainService: TerrainService;
        bugManager: BugManager;
        broadcastSnapshot: (matchId: string, snapshot: ViewStateSnapshot) => void;
    }
}

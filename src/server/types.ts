import { MatchService, ScenarioService, TerrainService } from '../sdk/index.js';
import { SessionManager } from './core/SessionManager.js';
import { WebSocket } from 'ws';
import { Side } from '../engine/core/Types.js';

export interface ManagedWebSocket extends WebSocket {
    isAlive?: boolean;
}

export interface ClientSession {
    id: string;
    ws: ManagedWebSocket;
    side?: Side;
    matchId?: string;
    lastPing: number;
    send: (data: any) => void;
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
        broadcastSnapshot: (matchId: string, snapshot: any) => void;
    }
}

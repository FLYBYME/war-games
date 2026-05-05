import { randomUUID } from 'crypto';
import { ClientSession, ManagedWebSocket } from '../types.js';
import { logger } from './Logger.js';

/**
 * SessionManager: Handles active WebSocket connections.
 */
export class SessionManager {
    private readonly sessions = new Map<ManagedWebSocket, ClientSession>();

    public createSession(ws: ManagedWebSocket): ClientSession {
        const session: ClientSession = {
            id: randomUUID(),
            ws,
            lastPing: Date.now(),
            send: (data: any) => {
                if (ws.readyState === ws.OPEN) {
                    ws.send(JSON.stringify(data));
                }
            }
        };
        this.sessions.set(ws, session);
        logger.debug(`Session created: ${session.id}`);
        return session;
    }

    public getSession(ws: ManagedWebSocket): ClientSession | undefined {
        return this.sessions.get(ws);
    }

    public removeSession(ws: ManagedWebSocket): void {
        const session = this.sessions.get(ws);
        if (session) {
            logger.debug(`Session removed: ${session.id}`);
        }
        this.sessions.delete(ws);
    }

    public getSessionsByMatch(matchId: string): ClientSession[] {
        return Array.from(this.sessions.values()).filter(s => s.matchId === matchId);
    }

    public getAllSessions(): ClientSession[] {
        return Array.from(this.sessions.values());
    }

    public broadcastToMatch(matchId: string, data: any): void {
        const matchSessions = this.getSessionsByMatch(matchId);
        const payload = JSON.stringify(data);
        for (const session of matchSessions) {
            if (session.ws.readyState === session.ws.OPEN) {
                session.ws.send(payload);
            }
        }
    }
}

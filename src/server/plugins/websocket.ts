import { FastifyInstance } from 'fastify';
import { Side } from '../../engine/core/Types.js';
import { CommandFactory } from '../../engine/core/CommandFactory.js';
import { logger } from '../core/Logger.js';
import { config } from '../core/Config.js';
import { DeltaEncoder, ScenarioManifest } from '../../sdk/index.js';
import { World } from '../../engine/core/World.js';
import { ScenarioLoader } from '../../engine/core/ScenarioLoader.js';
import { EntityManager } from '../../engine/core/EntityManager.js';
import { ClientSession, ManagedWebSocket } from '../types.js';
import { EnvironmentSystem } from '../../engine/systems/EnvironmentSystem.js';
import { ViewStateSystem } from '../../engine/systems/ViewStateSystem.js';

export async function registerWebSocketPlugin(app: FastifyInstance) {
    const deltaEncoder = new DeltaEncoder();

    const onConnection = (ws: any, req: any) => {
        try {
            const managedWs = ws as ManagedWebSocket;
            const session = app.sessionManager.createSession(managedWs);
            managedWs.isAlive = true;

            managedWs.on('pong', () => { managedWs.isAlive = true; });

            logger.info('New connection established', {
                sessionId: session.id,
                path: req.url
            });

            ws.on('error', (err: Error) => {
                logger.error('WebSocket error', { sessionId: session.id, error: err.message });
                app.sessionManager.removeSession(ws);
                ws.terminate();
            });

            ws.on('message', async (data: Buffer | string) => {
                try {
                    const msg = JSON.parse(data.toString());
                    await handleMessage(app, session, msg, deltaEncoder);
                } catch (err) {
                    logger.error('Failed to parse message', { error: err });
                    session.send({ type: 'ERROR', payload: { message: 'Invalid JSON payload' } });
                }
            });

            ws.on('close', () => {
                logger.info(`Connection closed`, { sessionId: session.id });
                deltaEncoder.clearSession(session.id);
                app.sessionManager.removeSession(ws);
            });
        } catch (err: any) {
            logger.error('Error in WebSocket initialization', { error: err.message });
            ws.terminate();
        }
    };

    // Listen on both /ws and /
    app.get('/ws', { websocket: true }, onConnection);
    app.get('/', { websocket: true }, onConnection);

    // Heartbeat interval
    const interval = setInterval(() => {
        if (app.websocketServer) {
            app.websocketServer.clients.forEach((ws: ManagedWebSocket) => {
                if (ws.isAlive === false) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        }
    }, config.heartbeatIntervalMs);

    app.addHook('onClose', async () => {
        clearInterval(interval);
    });

    app.decorate('broadcastSnapshot', (matchId: string, snapshot: any) => {
        const sessions = app.sessionManager.getSessionsByMatch(matchId);
        const now = Date.now();

        for (const session of sessions) {
            if (session.side === Side.Neutral || session.side === snapshot.side) {
                // Check Sync Rate Throttling
                if (session.syncRateHz && session.syncRateHz > 0) {
                    const minIntervalMs = 1000 / session.syncRateHz;
                    if (session.lastSyncTime && (now - session.lastSyncTime) < minIntervalMs) {
                        continue; // Skip this tick for this session
                    }
                }

                // Check Full Sync Interval
                if (session.fullSyncIntervalMs && session.fullSyncIntervalMs > 0) {
                    if (!session.lastFullSyncTime || (now - session.lastFullSyncTime) >= session.fullSyncIntervalMs) {
                        deltaEncoder.clearSession(session.id);
                        session.lastFullSyncTime = now;
                    }
                }

                const binaryPayload = deltaEncoder.encode(snapshot, session.id);
                if (session.ws.readyState === 1) { // OPEN
                    session.ws.send(binaryPayload);
                    session.lastSyncTime = now;
                }
            }
        }
    });
}

async function handleMessage(app: FastifyInstance, session: ClientSession, msg: any, deltaEncoder: DeltaEncoder): Promise<void> {
    const matchId = session.matchId || 'default';

    switch (msg.type) {
        case 'JOIN_MATCH':
            session.matchId = msg.matchId || 'default';
            session.side = (msg.side as Side) || Side.Blue;
            session.syncRateHz = msg.syncRateHz;
            session.fullSyncIntervalMs = msg.fullSyncIntervalMs;
            session.lastSyncTime = 0;
            session.lastFullSyncTime = 0;
            logger.info('Session joined match', { sessionId: session.id, matchId: session.matchId, side: session.side, syncRateHz: session.syncRateHz });

            const snapshot = await app.matchService.getInitialState(session.matchId || 'default', session.side);
            if (snapshot) {
                session.send({ type: 'VIEW_STATE', payload: snapshot });
                session.lastSyncTime = Date.now();
                session.lastFullSyncTime = Date.now();
            }
            break;

        case 'ISSUE_COMMAND':
            const cmd = CommandFactory.create(msg.command, session.side);
            if (!cmd) {
                session.send({ type: 'COMMAND_ACK', payload: { commandType: msg.command.type, success: false, error: 'Invalid or unauthorized command' } });
                return;
            }

            const world = app.matchService.getMatch(matchId);

            if (!world) {
                session.send({ type: 'COMMAND_ACK', payload: { commandType: msg.command.type, success: false, error: 'Match session not found' } });
                return;
            }

            // Side Isolation Check
            const entityId = (msg.command as any).entityId;
            const entity = entityId ? world.getEntity(entityId) : undefined;
            if (entity && entity.side !== session.side) {
                session.send({ type: 'COMMAND_ACK', payload: { commandType: msg.command.type, success: false, error: 'Side Isolation Violation' } });
                return;
            }

            world.queueExternalCommand(cmd);
            if (world.clock.isPaused) {
                await world.tick(0);
            }

            session.send({ type: 'COMMAND_ACK', payload: { commandType: msg.command.type, success: true } });
            break;

        case 'SET_TIME_COMPRESSION':
            app.matchService.setMatchTime(matchId, msg.rate, msg.rate === 0);
            break;

        case 'EXPORT_SCENARIO':
            const worldData = app.matchService.globalWorld.toJSON();
            session.send({ type: 'SCENARIO_EXPORTED', payload: worldData });
            break;

        case 'IMPORT_SCENARIO':
            if (msg.payload) {
                try {
                    const targetMatchId = msg.matchId || 'default';
                    const targetWorld = app.matchService.getMatch(targetMatchId) || app.matchService.globalWorld;

                    const isManifest = msg.payload.entities && msg.payload.entities.length > 0;

                    if (isManifest) {
                        const newWorld = new World(
                            undefined, undefined,
                            targetWorld.profileRegistry,
                            targetWorld.weaponProfiles,
                            targetWorld.loadoutRegistry
                        );
                        app.matchService.initializeWorldSystems(newWorld);
                        const loader = new ScenarioLoader(new EntityManager(newWorld, newWorld.profileRegistry));

                        const manifest = msg.payload as ScenarioManifest;
                        if (manifest.origin) {
                            const env = newWorld.getSystem(EnvironmentSystem);
                            const vs = newWorld.getSystem(ViewStateSystem);
                            if (env) env.setOrigin(manifest.origin.lat, manifest.origin.lon);
                            if (vs) vs.setOrigin(manifest.origin.lat, manifest.origin.lon);
                        }

                        loader.load(manifest);
                        newWorld.clock.setPaused(targetWorld.clock.isPaused);
                        newWorld.clock.setCompression(targetWorld.clock.timeCompression);

                        if (targetMatchId === 'default') {
                            app.matchService.updateGlobalWorld(newWorld);
                        } else {
                            // Using a safe cast here as we're managing the internal map
                            (app.matchService as any).matches.set(targetMatchId, newWorld);
                            app.matchService.setupEventBus(targetMatchId, newWorld);
                            // Ensure TickManager starts pulsing this new match
                            const onMatchCreated = (app.matchService as any).onMatchCreated;
                            if (onMatchCreated) onMatchCreated(targetMatchId);
                        }
                    } else {
                        const newWorld = World.fromJSON(msg.payload);
                        if (targetMatchId === 'default') {
                            app.matchService.updateGlobalWorld(newWorld);
                        } else {
                            (app.matchService as any).matches.set(targetMatchId, newWorld);
                            app.matchService.setupEventBus(targetMatchId, newWorld);
                            const onMatchCreated = (app.matchService as any).onMatchCreated;
                            if (onMatchCreated) onMatchCreated(targetMatchId);
                        }
                    }

                    deltaEncoder.reset();
                    session.send({ type: 'SCENARIO_IMPORTED', payload: { success: true, matchId: targetMatchId } });
                } catch (err: any) {
                    logger.error('Failed to import scenario', { error: err.message });
                    session.send({ type: 'ERROR', payload: { message: `Import failed: ${err.message}` } });
                }
            }
            break;

        case 'REQUEST_SNAPSHOT':
            const latestSnapshot = await app.matchService.getInitialState(matchId, session.side);
            if (latestSnapshot) {
                session.send({ type: 'VIEW_STATE', payload: latestSnapshot });
            }
            break;
    }
}

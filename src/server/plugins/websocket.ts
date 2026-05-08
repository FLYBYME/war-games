import { FastifyInstance, FastifyRequest } from 'fastify';
import { Side, ClientMessageSchema, ClientMessage, ScenarioManifest, ViewStateSnapshot, WorldState } from '../../engine/core/Types.js';
import { CommandFactory } from '../../engine/core/CommandFactory.js';
import { logger } from '../core/Logger.js';
import { config } from '../core/Config.js';
import { DeltaEncoder } from '../../sdk/index.js';
import { World } from '../../engine/core/World.js';
import { ScenarioLoader } from '../../engine/core/ScenarioLoader.js';
import { EntityManager } from '../../engine/core/EntityManager.js';
import { ClientSession, ManagedWebSocket } from '../types.js';
import { EnvironmentSystem } from '../../engine/systems/EnvironmentSystem.js';
import { ViewStateSystem } from '../../engine/systems/ViewStateSystem.js';

export async function registerWebSocketPlugin(app: FastifyInstance) {
    const deltaEncoder = new DeltaEncoder();

    const onConnection = (ws: unknown, req: FastifyRequest) => {
        try {
            const managedWs = ws as ManagedWebSocket;
            const session = app.sessionManager.createSession(managedWs);
            managedWs.isAlive = true;

            managedWs.on('pong', () => { managedWs.isAlive = true; });

            logger.info('New connection established', {
                sessionId: session.id,
                path: req.url
            });

            managedWs.on('error', (err: Error) => {
                logger.error('WebSocket error', { sessionId: session.id, error: err.message });
                app.sessionManager.removeSession(managedWs);
                managedWs.terminate();
            });

            managedWs.on('message', async (data: Buffer | string) => {
                try {
                    const rawMsg = JSON.parse(data.toString()) as unknown;
                    const msg = ClientMessageSchema.parse(rawMsg);
                    await handleMessage(app, session, msg, deltaEncoder);
                } catch (err: unknown) {
                    const error = err as Error;
                    logger.error('Failed to parse message', { error: error.message });
                    session.send({ type: 'ERROR', payload: { message: `Invalid message: ${error.message}` } });
                }
            });

            managedWs.on('close', () => {
                logger.info(`Connection closed`, { sessionId: session.id });
                deltaEncoder.clearSession(session.id);
                app.sessionManager.removeSession(managedWs);
            });
        } catch (err: unknown) {
            const error = err as Error;
            logger.error('Error in WebSocket initialization', { error: error.message });
            (ws as ManagedWebSocket).terminate();
        }
    };

    // Listen on both /ws and /
    app.get('/ws', { websocket: true }, onConnection);
    app.get('/', { websocket: true }, onConnection);

    // Heartbeat interval
    const interval = setInterval(() => {
        if (app.websocketServer) {
            app.websocketServer.clients.forEach((ws: unknown) => {
                const managedWs = ws as ManagedWebSocket;
                if (managedWs.isAlive === false) return managedWs.terminate();
                managedWs.isAlive = false;
                managedWs.ping();
            });
        }
    }, config.heartbeatIntervalMs);

    app.addHook('onClose', async () => {
        clearInterval(interval);
    });

    app.decorate('broadcastSnapshot', (matchId: string, snapshot: ViewStateSnapshot) => {
        const sessions = app.sessionManager.getSessionsByMatch(matchId);
        const now = Date.now();

        for (const session of sessions) {
            if (session.side === snapshot.side) {
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

async function handleMessage(app: FastifyInstance, session: ClientSession, msg: ClientMessage, deltaEncoder: DeltaEncoder): Promise<void> {
    const matchId = session.matchId || 'default';

    switch (msg.type) {
        case 'JOIN_MATCH': {
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
        }

        case 'ISSUE_COMMAND': {
            const cmd = CommandFactory.create(msg.command, session.side || Side.Blue);
            if (!cmd) {
                session.send({ type: 'COMMAND_ACK', payload: { commandType: msg.command.type, success: false, error: 'Invalid or unauthorized command', sequence: msg.sequence } });
                return;
            }

            const world = app.matchService.getMatch(matchId);

            if (!world) {
                session.send({ type: 'COMMAND_ACK', payload: { commandType: msg.command.type, success: false, error: 'Match session not found', sequence: msg.sequence } });
                return;
            }

            // Side Isolation Check
            const entityId = (msg.command as { entityId?: string }).entityId;
            const entity = entityId ? world.getEntity(entityId) : undefined;
            if (entity && entity.side !== session.side) {
                session.send({ type: 'COMMAND_ACK', payload: { commandType: msg.command.type, success: false, error: 'Side Isolation Violation', sequence: msg.sequence } });
                return;
            }

            world.queueExternalCommand(cmd);
            if (world.clock.isPaused) {
                await world.tick(0);
            }

            session.send({ type: 'COMMAND_ACK', payload: { commandType: msg.command.type, success: true, sequence: msg.sequence } });
            break;
        }

        case 'SET_TIME_COMPRESSION': {
            app.matchService.setMatchTime(matchId, msg.rate, msg.rate === 0);
            break;
        }

        case 'SAVE_MATCH': {
            if (msg.matchId && msg.filename) {
                try {
                    const world = app.matchService.getMatch(msg.matchId);
                    if (world) {
                        const worldData = world.toJSON();
                        await (app.scenarioService as { save: (f: string, d: unknown) => Promise<boolean> }).save(msg.filename, worldData);
                        session.send({ type: 'COMMAND_ACK', payload: { commandType: 'SAVE_MATCH', success: true } });
                        logger.info(`Match ${msg.matchId} saved to ${msg.filename}`);
                    }
                } catch (err: unknown) {
                    const error = err as Error;
                    logger.error('Failed to save match', { error: error.message });
                    session.send({ type: 'ERROR', payload: { message: `Save failed: ${error.message}` } });
                }
            }
            break;
        }

        case 'EXPORT_SCENARIO': {
            const worldData = app.matchService.globalWorld.toJSON();
            session.send({ type: 'SCENARIO_EXPORTED', payload: worldData });
            break;
        }

        case 'IMPORT_SCENARIO': {
            if (msg.payload) {
                try {
                    const targetMatchId = msg.matchId || 'default';
                    const targetWorld = app.matchService.getMatch(targetMatchId) || app.matchService.globalWorld;

                    const payloadTyped = msg.payload as { entities?: unknown[] };
                    const isManifest = payloadTyped.entities && payloadTyped.entities.length > 0;

                    if (isManifest) {
                        const newWorld = new World(
                            undefined, undefined,
                            targetWorld.profileRegistry,
                            targetWorld.weaponProfiles,
                            targetWorld.loadoutRegistry
                        );
                        app.matchService.initializeWorldSystems(newWorld);
                        const loader = new ScenarioLoader(new EntityManager(newWorld, newWorld.profileRegistry));

                        const manifest = msg.payload as unknown as ScenarioManifest;
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
                            app.matchService.registerMatch(targetMatchId, newWorld);
                        }
                    } else {
                        const newWorld = World.fromJSON(msg.payload as WorldState);
                        if (targetMatchId === 'default') {
                            app.matchService.updateGlobalWorld(newWorld);
                        } else {
                            app.matchService.registerMatch(targetMatchId, newWorld);
                        }
                    }

                    deltaEncoder.clearSession(session.id);
                    session.send({ type: 'SCENARIO_IMPORTED', payload: { success: true, matchId: targetMatchId } });
                } catch (err: unknown) {
                    const error = err as Error;
                    logger.error('Failed to import scenario', { error: error.message });
                    session.send({ type: 'ERROR', payload: { message: `Import failed: ${error.message}` } });
                }
            }
            break;
        }

        case 'GET_TELEMETRY': {
             const telemetry = await app.matchService.getTelemetry(matchId);
             session.send({ type: 'SCENARIO_EXPORTED', payload: telemetry }); 
             break;
        }

        case 'GET_PROFILES': {
             // Handled if needed
             break;
        }
    }
}

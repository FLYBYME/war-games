import { FastifyInstance } from 'fastify';
import { logger } from '../../core/Logger.js';
import { EngineCommandPayloadSchema, EngineCommandPayload } from '../../../sdk/schemas/protocol.js';
import { CommandFactory } from '../../../engine/core/CommandFactory.js';
import { Side } from '../../../sdk/schemas/domain.js';
import { ZodError } from 'zod';
import { SimulationEvent } from 'war-games/sdk';

interface MatchParams { matchId: string }
interface ProfileParams { id: string }
interface ScenarioParams { filename: string }

interface MatchQuery { side?: Side; count?: string }
interface StepBody { durationMinutes: number }
interface CommandBody { command: unknown; side: Side }
interface ScenarioLoadBody { filename: string; matchId?: string }
interface ScenarioSaveBody { filename: string; manifest: unknown }

export async function registerMatchRoutes(app: FastifyInstance) {
    app.get('/', async () => {
        return app.matchService.listMatches();
    });

    app.get<{ Params: MatchParams, Querystring: MatchQuery }>('/:matchId/viewstate', async (request, reply) => {
        const { matchId } = request.params;
        const { side } = request.query;
        const snapshot = await app.matchService.getInitialState(matchId, side || Side.Neutral);
        if (snapshot) return snapshot;
        reply.status(404).send({ error: 'Match not found' });
        return;
    });

    app.get<{ Params: MatchParams }>('/:matchId/winstate', async (request) => {
        const { matchId } = request.params;
        return app.matchService.getWinState(matchId);
    });

    app.get<{ Params: MatchParams, Querystring: MatchQuery }>('/:matchId/events', async (request) => {
        const { matchId } = request.params;
        const { count } = request.query;
        return app.matchService.getRecentEvents(matchId, count ? parseInt(count) : 50);
    });

    app.get<{ Params: ProfileParams }>('/profiles/:id', async (request, reply) => {
        const { id } = request.params;
        const profile = app.matchService.getProfile(id);
        if (profile) return profile;
        reply.status(404).send({ error: 'Profile not found' });
        return;
    });

    app.post<{ Params: MatchParams }>('/:matchId/load', async (request, reply) => {
        const { matchId } = request.params;
        const scenario = request.body as any;
        const world = await app.matchService.createMatch(matchId, scenario);
        if (!world) {
            reply.status(404).send({ error: 'Match not found' });
            return;
        }

        return { success: true, matchId };
    });

    app.get<{ Params: MatchParams }>('/:matchId/telemetry', async (request, reply) => {
        const { matchId } = request.params;
        const world = app.matchService.getMatch(matchId);
        if (!world) {
            reply.status(404).send({ error: 'Match not found' });
            return;
        }

        const debug: Record<string, unknown[]> = {};
        for (const entity of world.getEntities()) {
            const comps = entity.getAllComponents();
            debug[entity.id] = comps.map(c => ({ ...c }));
        }
        return { debug };
    });

    app.delete<{ Params: MatchParams }>('/:matchId', async (request, reply) => {
        const { matchId } = request.params;
        if (matchId === 'default') {
            reply.status(403).send({ error: 'Cannot delete default match' });
            return;
        }

        const world = app.matchService.getMatch(matchId);
        if (world) {
            app.matchService.deleteMatch(matchId);

            const sessions = app.sessionManager.getSessionsByMatch(matchId);
            for (const session of sessions) {
                session.send({ type: 'ERROR', payload: { message: 'Match has been deleted' } });
                session.ws.close();
            }

            logger.info(`Match deleted: ${matchId}`);
            return { success: true };
        } else {
            reply.status(404).send({ error: 'Match not found' });
            return;
        }
    });

    app.post<{ Params: MatchParams, Body: CommandBody }>('/:matchId/commands', async (request, reply) => {
        const { matchId } = request.params;
        const { command, side } = request.body;

        const world = app.matchService.getMatch(matchId);
        if (!world) {
            reply.status(404).send({ error: 'Match not found' });
            return;
        }

        try {
            const parsedCommand = EngineCommandPayloadSchema.parse(command) as EngineCommandPayload;
            const cmd = CommandFactory.create(parsedCommand, side || Side.Blue);

            if (!cmd) {
                reply.status(400).send({ error: 'Invalid or unauthorized command' });
                return;
            }

            // Side Isolation Check
            const entityId = (parsedCommand as { entityId?: string }).entityId;
            const entity = entityId ? world.getEntity(entityId) : undefined;
            if (entity && entity.side !== side) {
                reply.status(403).send({ error: 'Side Isolation Violation' });
                return;
            }

            world.queueExternalCommand(cmd);
            if (world.clock.isPaused) {
                await world.tick(0);
            }

            return { success: true, commandType: parsedCommand.type };
        } catch (err: unknown) {
            const error = err as Error;
            if (error instanceof ZodError) {
                reply.status(400).send({ error: 'Schema validation failed', details: error.errors });
            } else {
                reply.status(400).send({ error: 'Command execution failed', details: error.message });
            }
            return;
        }
    });

    app.post<{ Params: MatchParams, Body: StepBody }>('/:matchId/step', async (request, reply) => {
        const { matchId } = request.params;
        const { durationMinutes } = request.body;
        const minimumTime = 30;//30 sec

        const world = app.matchService.getMatch(matchId);
        if (!world) {
            reply.status(404).send({ error: 'Match not found' });
            return;
        }

        if (!world.clock.isPaused) {
            reply.status(400).send({ error: 'Match must be paused to step deterministically' });
            return;
        }

        const startTick = world.currentTick;
        const targetTicks = durationMinutes * 60 * 10;
        let interrupted = false;

        // Ensure events array gets populated during ticks
        const events: unknown[] = [];
        const ignore = ['ViewStateUpdated', 'metrics:performance'];
        const eventHandler = (event: SimulationEvent) => {
            if (!ignore.includes(event.type)) {
                events.push(event);
            }
        }

        world.events.onAny(eventHandler);

        for (let i = 0; i < targetTicks; i++) {
            await world.tick(0.1);
            if (events.length > 0 && (world.currentTick - startTick) >= minimumTime * 10) {
                interrupted = true;
                break;
            }
            // Yield to the event loop every 10 ticks to avoid starving the Node server
            if (i % 10 === 0) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }

        world.events.offAny(eventHandler);

        return {
            success: true,
            elapsedSeconds: (world.currentTick - startTick) / 10,
            interruptedByEvent: interrupted,
            events,
            currentTick: world.currentTick,
            elapsedTicks: world.currentTick - startTick
        };
    });

    // Scenarios
    app.get('/scenarios', async () => {
        return await app.scenarioService.list();
    });

    app.get<{ Params: ScenarioParams }>('/scenarios/:filename', async (request, reply) => {
        const { filename } = request.params;
        const manifest = await app.scenarioService.load(filename);
        if (manifest) return manifest;
        reply.status(404).send({ error: 'Scenario not found' });
        return;
    });

    app.post<{ Body: ScenarioSaveBody }>('/scenarios', async (request, reply) => {
        const { filename, manifest } = request.body;
        const ok = await app.scenarioService.save(filename, manifest as any);
        if (ok) return { success: true };
        reply.status(500).send({ error: 'Failed to save scenario' });
        return;
    });

    app.delete<{ Params: ScenarioParams }>('/scenarios/:filename', async (request, reply) => {
        const { filename } = request.params;
        const ok = await app.scenarioService.delete(filename);
        if (ok) return { success: true };
        reply.status(404).send({ error: 'Failed to delete scenario' });
        return;
    });

    app.post<{ Body: ScenarioLoadBody }>('/scenarios/load', async (request, reply) => {
        const { filename, matchId } = request.body;
        const manifest = await app.scenarioService.load(filename);
        if (!manifest) {
            reply.status(404).send({ error: 'Scenario not found' });
            return;
        }

        const targetMatchId = matchId || `session-${Date.now()}`;
        const world = await app.matchService.createMatch(targetMatchId, manifest);

        return {
            success: true,
            matchId: targetMatchId,
            tick: world.currentTick
        };
    });
}

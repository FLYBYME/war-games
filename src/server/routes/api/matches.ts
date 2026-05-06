import { FastifyInstance } from 'fastify';
import { logger } from '../../core/Logger.js';
import { EngineCommandPayloadSchema } from '../../../sdk/schemas/protocol.js';
import { CommandFactory } from '../../../engine/core/CommandFactory.js';
import { Side } from '../../../sdk/schemas/domain.js';

export async function registerMatchRoutes(app: FastifyInstance) {
    app.get('/', async () => {
        return app.matchService.listMatches();
    });

    app.get('/:matchId/viewstate', async (request, reply) => {
        const { matchId } = request.params as any;
        const { side } = request.query as any;
        const snapshot = await app.matchService.getInitialState(matchId, side || 'Neutral');
        if (snapshot) return snapshot;
        reply.status(404).send({ error: 'Match not found' });
        return;
    });

    app.get('/:matchId/winstate', async (request, reply) => {
        const { matchId } = request.params as any;
        return app.matchService.getWinState(matchId);
    });

    app.get('/:matchId/events', async (request, reply) => {
        const { matchId } = request.params as any;
        const { count } = request.query as any;
        return app.matchService.getRecentEvents(matchId, count ? parseInt(count) : 50);
    });
 
    app.get('/profiles/:id', async (request, reply) => {
        const { id } = request.params as any;
        const profile = app.matchService.getProfile(id);
        if (profile) return profile;
        reply.status(404).send({ error: 'Profile not found' });
        return;
    });

    app.get('/:matchId/telemetry', async (request, reply) => {
        const { matchId } = request.params as any;
        const world = app.matchService.getMatch(matchId);
        if (!world) {
            reply.status(404).send({ error: 'Match not found' });
            return;
        }

        const debug: Record<string, any> = {};
        for (const entity of world.getEntities()) {
            const comps = entity.getAllComponents();
            debug[entity.id] = comps.map(c => ({ type: c.type, ...c }));
        }
        return { debug };
    });

    app.delete('/:matchId', async (request, reply) => {
        const { matchId } = request.params as any;
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

    app.post('/:matchId/commands', async (request, reply) => {
        const { matchId } = request.params as any;
        const { command, side } = request.body as any;

        const world = app.matchService.getMatch(matchId);
        if (!world) {
            reply.status(404).send({ error: 'Match not found' });
            return;
        }

        try {
            const parsedCommand = EngineCommandPayloadSchema.parse(command);
            const cmd = CommandFactory.create(parsedCommand, side as Side || Side.Blue);
            
            if (!cmd) {
                reply.status(400).send({ error: 'Invalid or unauthorized command' });
                return;
            }

            // Side Isolation Check
            const entityId = (parsedCommand as any).entityId;
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
        } catch (err: any) {
            reply.status(400).send({ error: 'Schema validation failed', details: err.errors || err.message });
            return;
        }
    });

    app.post('/:matchId/step', async (request, reply) => {
        const { matchId } = request.params as any;
        const { durationMinutes } = request.body as any;

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
        const events: any[] = [];
        const eventHandler = (event: any) => events.push(event);
        
        // Assuming the engine emits 'TacticalEvent' or we can listen to specific ones.
        // The spec mentioned world.events.on('TacticalEvent', ...)
        world.events.on('TacticalEvent', eventHandler);

        for(let i=0; i<targetTicks; i++) {
            await world.tick(0.1);
            if (events.length > 0) {
                interrupted = true;
                break;
            }
            // Yield to the event loop every 10 ticks to avoid starving the Node server
            if (i % 10 === 0) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }
        
        world.events.off('TacticalEvent', eventHandler);

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

    app.get('/scenarios/:filename', async (request, reply) => {
        const { filename } = request.params as any;
        const manifest = await app.scenarioService.load(filename);
        if (manifest) return manifest;
        reply.status(404).send({ error: 'Scenario not found' });
        return;
    });

    app.post('/scenarios', async (request, reply) => {
        const { filename, manifest } = request.body as any;
        const ok = await app.scenarioService.save(filename, manifest);
        if (ok) return { success: true };
        reply.status(500).send({ error: 'Failed to save scenario' });
        return;
    });

    app.delete('/scenarios/:filename', async (request, reply) => {
        const { filename } = request.params as any;
        const ok = await app.scenarioService.delete(filename);
        if (ok) return { success: true };
        reply.status(404).send({ error: 'Failed to delete scenario' });
        return;
    });

    app.post('/scenarios/load', async (request, reply) => {
        const { filename, matchId } = request.body as any;
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

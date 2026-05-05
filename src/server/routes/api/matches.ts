import { FastifyInstance } from 'fastify';
import { logger } from '../../core/Logger.js';

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

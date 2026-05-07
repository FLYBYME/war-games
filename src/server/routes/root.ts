import { FastifyInstance } from 'fastify';
import { registerDatabaseRoutes } from './api/database.js';
import { registerMatchRoutes } from './api/matches.js';
import { registerTerrainRoutes } from './api/terrain.js';
import { registerSystemRoutes } from './api/system.js';
import { registerBugRoutes } from './api/bugs.js';
import { registerWebSocketPlugin } from '../plugins/websocket.js';

interface ScenarioParams { filename: string }
interface ScenarioLoadBody { filename: string; matchId?: string }

export async function registerRoutes(app: FastifyInstance) {
    // Health / Status
    app.get('/api/status', async () => {
        return {
            status: 'online',
            sessions: app.sessionManager.getAllSessions().length,
            matches: app.matchService.listMatches().length
        };
    });

    // Detailed Sessions for Manager
    app.get('/api/sessions', async () => {
        return app.sessionManager.getAllSessions().map(s => ({
            id: s.id,
            matchId: s.matchId || 'none',
            side: s.side || 'Neutral',
            lastPing: s.lastPing
        }));
    });

    // V1 Compatibility Routes (Redirects or direct handlers for paths V1 expects)
    // V1 Scenarios
    app.get('/api/scenarios', async () => {
        return await app.scenarioService.list();
    });

    app.get<{ Params: ScenarioParams }>('/api/scenarios/:filename', async (req, reply) => {
        const { filename } = req.params;
        const manifest = await app.scenarioService.load(filename);
        if (manifest) return manifest;
        reply.status(404).send({ error: 'Scenario not found' });
    });

    app.post<{ Body: ScenarioLoadBody }>('/api/scenarios/load', async (req, reply) => {
        const { filename, matchId } = req.body;
        const manifest = await app.scenarioService.load(filename);
        if (!manifest) return reply.status(404).send({ error: 'Scenario not found' });
        const targetId = matchId || `session-${Date.now()}`;
        const world = await app.matchService.createMatch(targetId, manifest);
        return { success: true, matchId: targetId, tick: world.currentTick };
    });

    // Register Plugins
    await registerWebSocketPlugin(app);

    // Register Sub-routes
    await app.register(registerDatabaseRoutes, { prefix: '/api/database' });
    await app.register(registerMatchRoutes, { prefix: '/api/matches' });
    await app.register(registerTerrainRoutes, { prefix: '/api/terrain' });
    await app.register(registerSystemRoutes, { prefix: '/api/system' });
    await app.register(registerBugRoutes, { prefix: '/api/bugs' });
}

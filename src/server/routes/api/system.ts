import { FastifyInstance } from 'fastify';

export async function registerSystemRoutes(app: FastifyInstance) {
    app.get('/metrics', async () => {
        const mem = process.memoryUsage();
        const stats = app.matchService.getStats();

        return {
            uptime: Math.floor(process.uptime()),
            memory: {
                rss: Math.round(mem.rss / 1024 / 1024),
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
                external: Math.round(mem.external / 1024 / 1024)
            },
            simulation: stats,
            totalTracerLogs: stats.totalTracerLogs,
            totalOctreeNodes: stats.totalOctreeNodes,
            sessions: app.sessionManager.getAllSessions().length
        };
    });
}

import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { globalServerToolRegistry } from './core/tool_builder.js';
import { generateRoutes, createHandler } from './core/route_generator.js';
import { IMatchService } from './core/tool_builder.js';

import { MatchService } from './services/MatchService.js';
import { initDb } from './db/db.js';

export async function createServer() {
    await initDb();
    const matchService = new MatchService();

    const serverContext = {
        app: {
            matchService
        }
    };
    const app = fastify({ logger: true });

    // Import all tools to ensure they are registered
    // A more dynamic import could be used in production
    await import('./tools/index.js');

    // Generate routes from the global registry
    const routes = generateRoutes(globalServerToolRegistry.entries(), '/api/v2');

    for (const route of routes) {
        const tool = globalServerToolRegistry.get(route.toolKey);
        if (!tool) continue;

        const handler = createHandler(tool, serverContext);

        app.route({
            method: route.method,
            url: route.url,
            handler: async (request: FastifyRequest, reply: FastifyReply) => {
                try {
                    const reqObj = {
                        params: (request.params as Record<string, string>) || {},
                        query: (request.query as Record<string, string>) || {},
                        body: (request.body as Record<string, any>) || {}
                    };
                    const result = await handler(reqObj);
                    return reply.send(result);
                } catch (err: any) {
                    app.log.error(err);
                    return reply.status(400).send({ error: err.message });
                }
            }
        });
    }

    // Special Route: sim_get_stream (SSE)
    app.get('/api/v2/matches/:matchId/simulation/stream', (request: FastifyRequest, reply: FastifyReply) => {
        const { matchId } = request.params as { matchId: string };
        
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        
        const interval = setInterval(() => {
            const data = JSON.stringify({
                type: 'tick',
                matchId,
                tick: Math.floor(Date.now() / 100), // Mock tick
                timestamp: Date.now()
            });
            reply.raw.write(`data: ${data}\n\n`);
        }, 100);

        request.raw.on('close', () => {
            clearInterval(interval);
        });
    });

    return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    createServer().then(app => {
        app.listen({ port: 3000, host: '0.0.0.0' }, (err: Error | null, address: string) => {
            if (err) {
                app.log.error(err);
                process.exit(1);
            }
            app.log.info(`V2 Server listening at ${address}`);
        });
    });
}

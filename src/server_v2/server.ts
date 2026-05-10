import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { globalServerToolRegistry } from './core/tool_builder.js';
import { generateRoutes, createHandler } from './core/route_generator.js';
import { IMatchService } from './core/tool_builder.js';

import { MatchService } from './services/MatchService.js';
import { TerrainService } from './services/TerrainService.js';
import { WorkerService } from './services/WorkerService.js';
import { AgentService } from './services/AgentService.js';
import { initDb } from './db/db.js';

export async function createServer() {
    await initDb();
    
    const app = fastify({ logger: true });

    const workerService = new WorkerService();
    const terrainService = new TerrainService(workerService);
    const matchService = new MatchService(terrainService);
    const agentService = new AgentService(process.env.OLLAMA_HOST);

    const serverContext = {
        app: {
            matchService,
            terrainService,
            workerService,
            agentService,
            log: app.log
        }
    };

    // Import all tools to ensure they are registered
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
                    const ac = new AbortController();
                    request.raw.on('close', () => ac.abort());

                    const reqObj = {
                        params: (request.params as Record<string, string>) || {},
                        query: (request.query as Record<string, string>) || {},
                        body: (request.body as Record<string, any>) || {},
                        signal: ac.signal
                    };

                    const result = await handler(reqObj);

                    if (route.isStream) {
                        reply.raw.setHeader('Content-Type', 'text/event-stream');
                        reply.raw.setHeader('Cache-Control', 'no-cache');
                        reply.raw.setHeader('Connection', 'keep-alive');

                        const iterable = result as AsyncIterable<any>;
                        for await (const chunk of iterable) {
                            reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
                        }
                        reply.raw.end();
                        return reply;
                    }

                    return await reply.send(result);
                } catch (err: any) {
                    app.log.error(err);
                    return reply.status(400).send({ error: err.message });
                }
            }
        });
    }

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

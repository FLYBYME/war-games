import fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { logger } from './core/Logger.js';

export async function createApp() {
    const app = fastify({
        logger: false, // We use our custom logger
        ignoreTrailingSlash: true,
    });

    // Request Logging
    app.addHook('onRequest', async (request) => {
        logger.info(`[HTTP] ${request.method} ${request.url}`);
    });

    // Register Plugins
    await app.register(cors, {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });

    await app.register(websocket);

    // Static Assets for Maps
    await app.register(fastifyStatic, {
        root: path.join(process.cwd(), 'metadata', 'grayscale-maps'),
        prefix: '/maps/',
    });

    // 404 Handler
    app.setNotFoundHandler((request, reply) => {
        logger.warn(`Route not found: ${request.method} ${request.url}`);
        reply.status(404).send({ error: 'Not Found', message: `Route ${request.method} ${request.url} not found` });
    });

    // Error Handler
    app.setErrorHandler((error: Error, request, reply) => {
        logger.error('Fastify Error', { 
            error: error.message, 
            url: request.url,
            method: request.method 
        });
        reply.status(500).send({ error: 'Internal Server Error', message: error.message });
    });

    return app;
}

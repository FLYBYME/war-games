import { createApp } from './app.js';
import { logger } from './core/Logger.js';
import { config as serverConfig } from './core/Config.js';
import { MatchService, ScenarioService } from '../sdk/index.js';
import { NodeStorageProvider, NodeImageProvider } from './core/NodeProviders.js';
import { SessionManager } from './core/SessionManager.js';
import { registerRoutes } from './routes/root.js';
import { TickManager } from './core/TickManager.js';

export async function startServer(port?: number, logLevel?: string) {
    if (logLevel) {
        logger.setLevel(logLevel as any);
    } else {
        logger.setLevel(serverConfig.logLevel);
    }

    const app = await createApp();

    // Providers
    const storage = new NodeStorageProvider();
    const image = new NodeImageProvider();
    const serviceConfig = { storage, logger, image, baseDir: process.cwd() };

    // Services
    const matchService = new MatchService(serviceConfig);
    const scenarioService = new ScenarioService(serviceConfig);
    const sessionManager = new SessionManager();

    await matchService.init();
    await scenarioService.init();

    const tickManager = new TickManager(matchService, logger);

    // Decorate app with services BEFORE registering routes
    app.decorate('matchService', matchService);
    app.decorate('scenarioService', scenarioService);
    app.decorate('sessionManager', sessionManager);
    app.decorate('terrainService', matchService.terrainService);

    // Register Routes
    await registerRoutes(app);

    // Connect Service Callbacks to Plugins
    matchService.setBroadcastCallback((matchId, snapshot) => {
        app.broadcastSnapshot(matchId, snapshot);
    });

    matchService.setEventCallback((matchId, event) => {
        sessionManager.broadcastToMatch(matchId, {
            type: 'EVENT',
            payload: event
        });
    });

    // Start Initial Loop for default match
    tickManager.startLoop('default');

    const finalPort = port !== undefined ? port : serverConfig.port;
    const address = await app.listen({ port: finalPort, host: '0.0.0.0' });
    const listeningPort = (app.server.address() as any).port;
    logger.info(`Server listening on port ${listeningPort} (Fastify)`);

    return {
        app,
        stop: async () => {
            tickManager.stopAll();
            await app.close();
        },
        port: listeningPort
    };
}

if (process.argv[1].endsWith('server/index.ts') || process.argv[1].endsWith('server/index.js')) {
    startServer().catch(err => {
        logger.error('Failed to start server', { error: err.message });
        process.exit(1);
    });
}

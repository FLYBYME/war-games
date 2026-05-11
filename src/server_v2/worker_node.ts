import fastify from 'fastify';
import { TerrainService } from './services/TerrainService.js';
import { WorkerService } from './services/WorkerService.js';
import { HarvesterService } from './services/HarvesterService.js';
import { QuadTreeBaker } from './services/QuadTreeBaker.js';
import { TheaterBundlerService } from './services/TheaterBundlerService.js';
import { SpatialDatabase } from './services/SpatialDatabase.js';
import { ZeroCopyElevationService } from './services/ZeroCopyElevationService.js';
import { WgtFormat } from '../engine/environment/utils/WgtFormat.js';
import { globalServerToolRegistry, IServerApp, ToolContext } from './core/tool_builder.js';
import { generateRoutes, createHandler } from './core/route_generator.js';

/**
 * WorkerNode: A stable, high-performance geodetic "Slave" process.
 * Exposes binary terrain streams and offloads simulation math.
 */
export async function createWorkerNode(port: number = 8080) {
    const app = fastify({ 
        logger: true,
        disableRequestLogging: true 
    });

    // ─── CORS Support ────────────────────────────────────────────────────────
    
    app.addHook('onRequest', async (request, reply) => {
        // Add start time for performance tracking immediately
        (request as any).startTime = process.hrtime();

        reply.header('Access-Control-Allow-Origin', '*');
        reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (request.method === 'OPTIONS') {
            reply.status(204).send();
            return;
        }
    });

    app.addHook('onResponse', async (request, reply) => {
        const [s, ns] = process.hrtime((request as any).startTime);
        const duration = (s * 1000 + ns / 1000000).toFixed(2);
        
        if (request.url !== '/health') {
            const status = reply.statusCode >= 400 ? '❌' : '✅';
            console.log(`${status} ${request.method} ${request.url} - ${reply.statusCode} (${duration}ms)`);
        }
    });

    // ─── Service Initialization ──────────────────────────────────────────────
    
    // ─── Service Initialization ──────────────────────────────────────────────
    
    const spatialDb = new SpatialDatabase();
    const zeroCopyElev = new ZeroCopyElevationService();
    const workerService = new WorkerService();
    const terrainService = new TerrainService(workerService, spatialDb, zeroCopyElev);
    const harvesterService = new HarvesterService(terrainService);
    const baker = new QuadTreeBaker(terrainService);
    const bundler = new TheaterBundlerService(baker);

    // ─── Tool System Integration ──────────────────────────────────────────────
    
    // Import all tools to ensure they are registered
    await import('./tools/index.js');

    const serverContext = {
        app: {
            terrainService,
            workerService,
            // Mocked services for Worker Node
            matchService: {
                getMatch: () => { throw new Error("MatchService not available on Regional Worker Node"); },
                listMatches: () => [],
                createMatch: async () => { throw new Error("MatchService not available on Regional Worker Node"); },
                deleteMatch: () => false
            },
            agentService: {
                createAgent: () => { throw new Error("AgentService not available on Regional Worker Node"); }
            },
            log: app.log
        } as unknown as IServerApp
    };

    // Generate routes for geodetic and env tools (Regional Role)
    const toolRoutes = generateRoutes(globalServerToolRegistry.entries('REGIONAL_WORKER'), '/api/v2');
    
    for (const route of toolRoutes) {
        const tool = globalServerToolRegistry.get(route.toolKey);
        if (!tool) continue;

        const handler = createHandler(tool, serverContext);

        app.route({
            method: route.method,
            url: route.url,
            handler: async (request: any, reply: any) => {
                try {
                    const reqObj = {
                        params: request.params || {},
                        query: request.query || {},
                        body: request.body || {}
                    };
                    const result = await handler(reqObj);
                    return await reply.send(result);
                } catch (err: any) {
                    return reply.status(400).send({ error: err.message });
                }
            }
        });
    }

    // ─── Health & Capabilities ───────────────────────────────────────────────
    
    app.get('/health', async () => ({
        status: 'ok',
        capabilities: ['terrain.degree', 'terrain.quad', 'math.los', 'harvester'],
        uptime: process.uptime(),
        version: '3.0.0'
    }));

    // ─── 1. SIM STREAM: 1x1 Degree Raw Tiles ─────────────────────────────────
    
    app.get('/api/v2/terrain/tile/degree', async (request, reply) => {
        const { lat, lon, res } = request.query as any;
        if (lat === undefined || lon === undefined) {
            return reply.status(400).send({ error: 'Missing lat/lon' });
        }

        try {
            const targetRes = res ? Number(res) : 1201;
            console.log(`📦 Serving Degree Tile: N${lat}E${lon} @ ${targetRes}res`);
            const tile = await terrainService.getTile(Number(lat), Number(lon), targetRes);
            
            // Encode as WGTv2 (Raw Binary)
            const encoded = WgtFormat.encode(
                tile.resolution,
                tile.lat,
                tile.lon,
                tile.data as any
            );

            reply.type('application/octet-stream');
            return Buffer.from(encoded);
        } catch (err: any) {
            app.log.error(err);
            return reply.status(500).send({ error: err.message });
        }
    });

    // ─── 2. UI STREAM: QuadTree z/x/y Tiles ──────────────────────────────────
    
    app.get('/api/v2/terrain/tile/quad/:z/:x/:y', async (request, reply) => {
        const { z, x, y } = request.params as any;
        const iz = Number(z);
        const ix = Number(x);
        const iy = Number(y);

        try {
            // 1. FAST PATH: Check SQLite Cache directly
            const cached = spatialDb.getQuadTile(iz, ix, iy);
            if (cached) {
                reply.type('application/octet-stream');
                return Buffer.from(cached);
            }

            // 2. Fallback to Baker
            const tile = await baker.getTile(iz, ix, iy);
            
            // Only cache if not a fallback
            if (!tile.isFallback) {
                spatialDb.saveQuadTile(iz, ix, iy, tile.data as Buffer);
            }
            
            reply.type('application/octet-stream');
            return Buffer.from(tile.data as any);
        } catch (err: any) {
            app.log.error(err);
            return reply.status(500).send({ error: err.message });
        }
    });

    app.post('/api/v2/terrain/theater/bundle', async (request, reply) => {
        const { tiles } = request.body as any;
        if (!tiles || !Array.isArray(tiles)) {
            return reply.status(400).send({ error: 'Missing tiles array' });
        }

        console.log(`📦 Bundling ${tiles.length} tiles for client...`);

        try {
            const bundle = await bundler.createBundle(tiles);
            reply.type('application/octet-stream');
            return Buffer.from(bundle);
        } catch (err: any) {
            app.log.error(err);
            return reply.status(500).send({ error: err.message });
        }
    });

    // ─── 3. MATH ORACLE (Legacy Routes - Redirecting to Tools) ──────────────
    // Note: The Tool System now handles /api/v2/map/... and /api/v2/env/...
    // We keep these manual routes only if legacy compatibility is strictly required,
    // otherwise the Tool System routes generated above will take precedence or coexist.

    // ─── 4. HARVESTER ────────────────────────────────────────────────────────
    
    app.get('/api/v2/harvester/status', async () => {
        return harvesterService.getStatus();
    });

    app.post('/api/v2/harvester/start', async () => {
        void harvesterService.start();
        return { status: 'STARTED' };
    });

    app.post('/api/v2/harvester/stop', async () => {
        harvesterService.stop();
        return { status: 'STOPPED' };
    });

    // ─── Startup ─────────────────────────────────────────────────────────────

    try {
        await app.listen({ port, host: '0.0.0.0' });
        console.log(`\n🌍 Regional Node (V3) running on http://0.0.0.0:${port}`);
        
        // Auto-start harvester in background
        void harvesterService.start();
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

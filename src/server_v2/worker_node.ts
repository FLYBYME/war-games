import fastify from 'fastify';
import { TerrainService } from './services/TerrainService.js';
import { WorkerService } from './services/WorkerService.js';
import { HarvesterService } from './services/HarvesterService.js';
import { QuadTreeBaker } from './services/QuadTreeBaker.js';
import { TheaterBundlerService } from './services/TheaterBundlerService.js';
import { WgtFormat } from '../engine/environment/utils/WgtFormat.js';

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
    
    const workerService = new WorkerService();
    const terrainService = new TerrainService(workerService);
    const harvesterService = new HarvesterService(terrainService);
    const baker = new QuadTreeBaker(terrainService);
    const bundler = new TheaterBundlerService(baker);

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
        console.log(`🖼️  Serving Quad Tile: z${z}/x${x}/y${y}`);
        
        try {
            const encoded = await baker.getTile(Number(z), Number(x), Number(y));
            reply.type('application/octet-stream');
            return Buffer.from(encoded);
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

    // ─── 3. MATH ORACLE ──────────────────────────────────────────────────────

    app.post('/api/v2/env/math/los', async (request, reply) => {
        const { p1, p2, numSamples = 10 } = request.body as any;
        console.log(`📐 LOS Calculation: (${p1.lat},${p1.lon}) -> (${p2.lat},${p2.lon})`);
        
        if (!p1 || !p2) return reply.status(400).send({ error: 'Missing endpoints' });

        try {
            // Simplified LOS math using terrainService
            for (let i = 1; i < numSamples; i++) {
                const t = i / numSamples;
                const sampleAlt = p1.alt + (p2.alt - p1.alt) * t;
                const sampleLat = p1.lat + (p2.lat - p1.lat) * t;
                const sampleLon = p1.lon + (p2.lon - p1.lon) * t;
                
                const terrainHeight = await terrainService.getElevation(sampleLat, sampleLon);
                
                if (sampleAlt < terrainHeight - 0.1) {
                    return { blocked: true, height: terrainHeight };
                }
            }
            return { blocked: false, height: 0 };
        } catch (err: any) {
            return reply.status(500).send({ error: err.message });
        }
    });

    app.post('/api/v2/env/math/profile', async (request, reply) => {
        const { p1, p2, points = 50 } = request.body as any;
        if (!p1 || !p2) return reply.status(400).send({ error: 'Missing endpoints' });

        try {
            const elevations = await terrainService.getElevationProfile(
                p1.lat, p1.lon, 
                p2.lat, p2.lon, 
                points
            );
            return { elevations };
        } catch (err: any) {
            return reply.status(500).send({ error: err.message });
        }
    });

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

import fastify from 'fastify';
import { TerrainService } from './services/TerrainService.js';
import { WorkerService } from './services/WorkerService.js';

/**
 * WorkerNode: A standalone Node.js process designed to run on a remote machine.
 * Exposes storage-heavy or compute-heavy services (like Terrain) over HTTP.
 * 
 * Designed to be "stable" - the API here should rarely change so the node 
 * doesn't need frequent reboots or updates.
 */
export async function createWorkerNode(port: number = 8080) {
    const app = fastify({ logger: true });

    // Initialize services
    const workerService = new WorkerService();
    const terrainService = new TerrainService(workerService);

    // ─── Health & Capabilities ───────────────────────────────────────────────
    
    app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));
    
    app.get('/capabilities', async () => ({
        capabilities: ['terrain', 'elevation'],
        version: '1.0.0'
    }));

    // ─── Terrain Endpoints ───────────────────────────────────────────────────

    app.get('/terrain/tile', async (request, reply) => {
        const { lat, lon, res } = request.query as any;
        if (!lat || !lon) return reply.status(400).send({ error: 'Missing lat/lon' });

        try {
            const tile = await terrainService.getTile(Number(lat), Number(lon), res ? Number(res) : 1201);
            
            // Re-encode to WGT for transport
            const encoded = WgtFormat.encode(tile.resolution, tile.lat, tile.lon, tile.data);
            
            reply.type('application/octet-stream');
            return Buffer.from(encoded);
        } catch (err: any) {
            return reply.status(500).send({ error: err.message });
        }
    });

    app.get('/terrain/elevation', async (request, reply) => {
        const { lat, lon } = request.query as any;
        if (!lat || !lon) return reply.status(400).send({ error: 'Missing lat/lon' });
        
        const elevation = await terrainService.getElevation(Number(lat), Number(lon));
        return { elevation };
    });

    // ─── Startup ─────────────────────────────────────────────────────────────

    try {
        await app.listen({ port, host: '0.0.0.0' });
        console.log(`\n🚀 Worker Node running on http://0.0.0.0:${port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

import { FastifyInstance } from 'fastify';

export async function registerTerrainRoutes(app: FastifyInstance) {
    app.get('/manifest', async () => {
        return {
            regions: app.terrainService.getRegions()
        };
    });

    app.get('/stats', async () => {
        const stats = await app.terrainService.getStats();
        return stats;
    });

    app.post('/clear-cache', async () => {
        await app.terrainService.clearCache();
        return { success: true };
    });

    app.get('/tiles/:lat/:lon', async (request, reply) => {
        const { lat, lon } = request.params as any;
        const tile = await app.terrainService.getTileEncoded(parseFloat(lat), parseFloat(lon));
        
        if (tile) {
            reply.type('application/octet-stream');
            return Buffer.from(tile);
        } else {
            reply.status(404).send({ error: 'Tile not found' });
            return;
        }
    });

    app.get('/ui-tiles/:lat/:lon', async (request, reply) => {
        const { lat, lon } = request.params as any;
        const tile = await app.terrainService.getTileEncoded(parseFloat(lat), parseFloat(lon));
        
        if (tile) {
            reply.type('application/octet-stream');
            return Buffer.from(tile);
        } else {
            reply.status(404).send({ error: 'Tile not found' });
            return;
        }
    });
}

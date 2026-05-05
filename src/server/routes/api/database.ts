import { FastifyInstance } from 'fastify';
import { logger } from '../../core/Logger.js';

export async function registerDatabaseRoutes(app: FastifyInstance) {
    app.get('/profiles', async () => {
        return app.matchService.getProfileDatabase();
    });

    app.post('/profiles', async (request, reply) => {
        try {
            const { id, profile } = request.body as any;
            app.matchService.registerProfile(id, profile);
            logger.info(`Profile updated via API: ${id}`);
            return { success: true };
        } catch (err) {
            reply.status(400).send({ error: 'Invalid profile data' });
            return;
        }
    });
}

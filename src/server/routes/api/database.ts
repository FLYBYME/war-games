import { FastifyInstance } from 'fastify';
import { logger } from '../../core/Logger.js';
import { EntityProfile } from '../../../sdk/schemas/index.js';

interface ProfilePostBody {
    id: string;
    profile: EntityProfile;
}

export async function registerDatabaseRoutes(app: FastifyInstance) {
    app.get('/profiles', async () => {
        return app.matchService.getProfileDatabase();
    });

    app.post<{ Body: ProfilePostBody }>('/profiles', async (request, reply) => {
        try {
            const { id, profile } = request.body;
            app.matchService.registerProfile(id, profile);
            logger.info(`Profile updated via API: ${id}`);
            return { success: true };
        } catch (err: unknown) {
            reply.status(400).send({ error: 'Invalid profile data' });
            return;
        }
    });
}

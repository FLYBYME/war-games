import { FastifyInstance } from 'fastify';
import { CreateBugReportSchema, UpdateBugReportSchema, AddBugCommentSchema } from '../../../sdk/schemas/bugs.js';

interface BugParams { id: string }

export async function registerBugRoutes(app: FastifyInstance) {
    const bugManager = app.bugManager;

    app.get('/', async () => {
        return bugManager.listBugs();
    });

    app.get<{ Params: BugParams }>('/:id', async (req, reply) => {
        const { id } = req.params;
        const bug = bugManager.getBug(id);
        if (!bug) {
            return reply.status(404).send({ error: 'Bug not found' });
        }
        return bug;
    });

    app.post('/', async (req, reply) => {
        try {
            const data = CreateBugReportSchema.parse(req.body);
            const bug = await bugManager.createBug(data);
            return bug;
        } catch (e: unknown) {
            const error = e as Error;
            return reply.status(400).send({ error: error.message });
        }
    });

    app.patch<{ Params: BugParams }>('/:id', async (req, reply) => {
        const { id } = req.params;
        try {
            const data = UpdateBugReportSchema.parse(req.body);
            const bug = await bugManager.updateBug(id, data);
            if (!bug) {
                return reply.status(404).send({ error: 'Bug not found' });
            }
            return bug;
        } catch (e: unknown) {
            const error = e as Error;
            return reply.status(400).send({ error: error.message });
        }
    });

    app.post<{ Params: BugParams }>('/:id/comments', async (req, reply) => {
        const { id } = req.params;
        try {
            const data = AddBugCommentSchema.parse(req.body);
            const comment = await bugManager.addComment(id, data);
            if (!comment) {
                return reply.status(404).send({ error: 'Bug not found' });
            }
            return comment;
        } catch (e: unknown) {
            const error = e as Error;
            return reply.status(400).send({ error: error.message });
        }
    });
}

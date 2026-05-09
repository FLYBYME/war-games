import { defineTool } from '../../core/tool_builder.js';
import { bugGetContract } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { bugs, bugComments } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export const bug_get = defineTool(bugGetContract, async (input, ctx) => {
    const bug = db.select().from(bugs).where(eq(bugs.id, input.id)).get();
    if (!bug) throw new Error(`Bug report not found: ${input.id}`);

    const comments = db.select()
        .from(bugComments)
        .where(eq(bugComments.bugId, bug.id))
        .all();

    return {
        id: bug.id,
        matchId: bug.matchId ?? undefined,
        side: bug.side ?? undefined,
        title: bug.title,
        description: bug.description,
        severity: bug.severity as any,
        status: bug.status as any,
        suggestedFix: bug.suggestedFix ?? undefined,
        worldState: bug.worldState as any,
        createdAt: bug.createdAt,
        updatedAt: bug.updatedAt,
        comments: comments.map(c => ({
            id: c.id,
            author: c.author,
            text: c.text,
            createdAt: c.createdAt
        }))
    };
});

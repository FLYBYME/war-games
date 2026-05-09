import { defineTool } from '../../core/tool_builder.js';
import { bugUpdateContract } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { bugs, bugComments } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export const bug_update = defineTool(bugUpdateContract, async (input, ctx) => {
    const existing = db.select().from(bugs).where(eq(bugs.id, input.id)).get();
    if (!existing) throw new Error(`Bug report not found: ${input.id}`);

    const now = new Date();
    db.update(bugs)
        .set({
            status: input.status || existing.status,
            severity: input.severity || existing.severity,
            suggestedFix: input.suggestedFix || existing.suggestedFix,
            updatedAt: now
        })
        .where(eq(bugs.id, input.id))
        .run();

    const updated = db.select().from(bugs).where(eq(bugs.id, input.id)).get();
    const comments = db.select()
        .from(bugComments)
        .where(eq(bugComments.bugId, input.id))
        .all();

    return {
        id: updated!.id,
        matchId: updated!.matchId ?? undefined,
        side: updated!.side ?? undefined,
        title: updated!.title,
        description: updated!.description,
        severity: updated!.severity as any,
        status: updated!.status as any,
        suggestedFix: updated!.suggestedFix ?? undefined,
        worldState: updated!.worldState as any,
        createdAt: updated!.createdAt,
        updatedAt: updated!.updatedAt,
        comments: comments.map(c => ({
            id: c.id,
            author: c.author,
            text: c.text,
            createdAt: c.createdAt
        }))
    };
});

import { defineTool } from '../../core/tool_builder.js';
import { bugAddCommentContract } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { bugComments, bugs } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export const bug_add_comment = defineTool(bugAddCommentContract, async (input, ctx) => {
    const bug = db.select().from(bugs).where(eq(bugs.id, input.bugId)).get();
    if (!bug) throw new Error(`Bug report not found: ${input.bugId}`);

    const id = `COM-${Date.now()}`;
    const now = new Date();

    const newComment = {
        id,
        bugId: input.bugId,
        author: input.author,
        text: input.text,
        createdAt: now
    };

    db.insert(bugComments).values(newComment).run();

    return newComment;
});

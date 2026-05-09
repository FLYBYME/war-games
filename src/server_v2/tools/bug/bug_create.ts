import { defineTool } from '../../core/tool_builder.js';
import { bugCreateContract } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { bugs } from '../../db/schema.js';

export const bug_create = defineTool(bugCreateContract, async (input, ctx) => {
    const id = `BUG-${Date.now()}`;
    const now = new Date();

    const newBug = {
        id,
        matchId: input.matchId,
        side: input.side,
        title: input.title,
        description: input.description,
        severity: input.severity,
        status: 'Open' as const,
        suggestedFix: input.suggestedFix,
        worldState: input.worldState,
        createdAt: now,
        updatedAt: now
    };

    db.insert(bugs).values(newBug).run();

    return {
        ...newBug,
        comments: []
    };
});

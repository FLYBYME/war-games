import { defineTool } from '../../core/tool_builder.js';
import { bugListContract, BugSeveritySchema, BugStatusSchema } from '../../../sdk_v2/contracts/bug/bug.contracts.js';
import { db } from '../../db/db.js';
import { bugs, bugComments } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

type BugSeverity = z.infer<typeof BugSeveritySchema>;
type BugStatus = z.infer<typeof BugStatusSchema>;

export const bug_list = defineTool(bugListContract, async (input, ctx) => {
    let conditions = [];
    if (input.status) conditions.push(eq(bugs.status, input.status));
    if (input.severity) conditions.push(eq(bugs.severity, input.severity));

    const results = db.select()
        .from(bugs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(bugs.createdAt))
        .all();

    // In a real app, we'd use a join or separate query for comments.
    // For this prototype, we'll fetch comments for each bug or just return empty for list.
    // The contract says comments: BugComment[], so we must provide them.

    const bugsWithComments = results.map(bug => {
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
            severity: bug.severity as BugSeverity,
            status: bug.status as BugStatus,
            suggestedFix: bug.suggestedFix ?? undefined,
            worldState: bug.worldState,
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

    return {
        bugs: bugsWithComments,
        totalCount: results.length
    };
});

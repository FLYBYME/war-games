import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';

// ─── Bug Schemas ─────────────────────────────────────────────────────────────

export const BugStatusSchema = z.enum(['Open', 'InProgress', 'Resolved', 'Closed']).describe("Current lifecycle state of the issue");
export const BugSeveritySchema = z.enum(['Low', 'Medium', 'High', 'Critical']).describe("Impact level of the issue");

export const BugCommentSchema = z.object({
    id: z.string().describe("Unique comment ID"),
    author: z.string().describe("Author of the comment"),
    text: z.string().describe("Comment body"),
    createdAt: z.date().describe("Creation timestamp")
});

export const BugReportSchema = z.object({
    id: z.string().describe("Unique bug ID"),
    matchId: z.string().optional().describe("Associated match ID (if any)"),
    side: z.string().optional().describe("Associated side (if any)"),
    title: z.string().describe("Brief summary of the issue"),
    description: z.string().describe("Detailed reproduction steps or description"),
    severity: BugSeveritySchema,
    status: BugStatusSchema,
    suggestedFix: z.string().optional().describe("Proposed solution"),
    worldState: z.unknown().optional().describe("Captured ECS state snapshot"),
    comments: z.array(BugCommentSchema).describe("Discussion thread"),
    createdAt: z.date().describe("Creation timestamp"),
    updatedAt: z.date().describe("Last modification timestamp")
});

// ─── bug_list ────────────────────────────────────────────────────────────────

export const BugListInputSchema = z.object({
    status: BugStatusSchema.optional().describe("Filter by status"),
    severity: BugSeveritySchema.optional().describe("Filter by severity")
});

export const BugListOutputSchema = z.object({
    bugs: z.array(BugReportSchema).describe("List of reports"),
    totalCount: z.number().describe("Total reports matching criteria")
});

export const bugListContract = defineContract({
    domain: 'bug',
    action: 'list',
    description: 'Retrieve a list of all reported issues.',
    inputSchema: BugListInputSchema,
    outputSchema: BugListOutputSchema,
    rest: { method: 'GET', path: '/bugs' }
});

// ─── bug_create ──────────────────────────────────────────────────────────────

export const BugCreateInputSchema = z.object({
    matchId: z.string().optional().describe("Associated match ID"),
    side: z.string().optional().describe("Side reporting the issue"),
    title: z.string().describe("Issue title"),
    description: z.string().describe("Detailed description"),
    severity: BugSeveritySchema.describe("Initial severity"),
    suggestedFix: z.string().optional().describe("Suggested solution"),
    worldState: z.unknown().optional().describe("Snapshot of relevant ECS state")
});

export const bugCreateContract = defineContract({
    domain: 'bug',
    action: 'create',
    description: 'Report a new issue found in the simulation.',
    inputSchema: BugCreateInputSchema,
    outputSchema: BugReportSchema,
    rest: { method: 'POST', path: '/bugs' }
});

// ─── bug_get ─────────────────────────────────────────────────────────────────

export const BugGetInputSchema = z.object({
    id: z.string().describe("Unique bug ID")
});

export const bugGetContract = defineContract({
    domain: 'bug',
    action: 'get',
    description: 'Retrieve detailed information for a specific issue.',
    inputSchema: BugGetInputSchema,
    outputSchema: BugReportSchema,
    rest: { method: 'GET', path: '/bugs/:id' }
});

// ─── bug_update ──────────────────────────────────────────────────────────────

export const BugUpdateInputSchema = z.object({
    id: z.string().describe("Bug ID to update"),
    status: BugStatusSchema.optional().describe("Update status"),
    severity: BugSeveritySchema.optional().describe("Update severity"),
    suggestedFix: z.string().optional().describe("Update proposed fix")
});

export const bugUpdateContract = defineContract({
    domain: 'bug',
    action: 'update',
    description: 'Modify an existing bug report (e.g., change status or severity).',
    inputSchema: BugUpdateInputSchema,
    outputSchema: BugReportSchema,
    rest: { method: 'PATCH', path: '/bugs/:id' }
});

// ─── bug_add_comment ─────────────────────────────────────────────────────────

export const BugAddCommentInputSchema = z.object({
    bugId: z.string().describe("ID of the report to comment on"),
    author: z.string().describe("Author name"),
    text: z.string().describe("Comment body")
});

export const bugAddCommentContract = defineContract({
    domain: 'bug',
    action: 'add_comment',
    description: 'Add a new comment or update to an issue discussion.',
    inputSchema: BugAddCommentInputSchema,
    outputSchema: BugCommentSchema,
    rest: { method: 'POST', path: '/bugs/:bugId/comments' }
});

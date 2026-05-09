import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { MatchSchema, MatchStatusSchema } from './match.schema.js';

// ─── match_list ──────────────────────────────────────────────────────────────

export const MatchListInputSchema = z.object({
    page: z.number().default(1).describe("Page number to retrieve"),
    pageSize: z.number().default(20).describe("Items per page"),
    status: MatchStatusSchema.optional().describe("Filter by match status"),
    scenarioId: z.string().optional().describe("Filter by scenario ID")
});

export const MatchListOutputSchema = z.object({
    matches: z.array(MatchSchema).describe("Matches for the requested page"),
    totalCount: z.number().describe("Total matches matching filters")
});

export const matchListContract = defineContract({
    domain: 'match',
    action: 'list',
    description: 'Retrieve a paginated list of matches with optional filtering.',
    inputSchema: MatchListInputSchema,
    outputSchema: MatchListOutputSchema,
    rest: { method: 'GET', path: '/matches' }
});

// ─── match_create ────────────────────────────────────────────────────────────

export const MatchCreateInputSchema = z.object({
    name: z.string().describe("Match name"),
    description: z.string().optional().describe("Match description"),
    scenarioId: z.string().describe("Scenario template ID to load"),
    maxTurns: z.number().optional().default(10000).describe("Maximum simulation ticks")
});

export const MatchCreateOutputSchema = MatchSchema;

export const matchCreateContract = defineContract({
    domain: 'match',
    action: 'create',
    description: 'Create a new simulation match from a scenario template.',
    inputSchema: MatchCreateInputSchema,
    outputSchema: MatchCreateOutputSchema,
    rest: { method: 'POST', path: '/matches' }
});

// ─── match_get ───────────────────────────────────────────────────────────────

export const MatchGetInputSchema = z.object({
    matchId: z.string().describe("The match ID")
});

export const matchGetContract = defineContract({
    domain: 'match',
    action: 'get',
    description: 'Retrieve the metadata and current status of a specific match.',
    inputSchema: MatchGetInputSchema,
    outputSchema: MatchSchema,
    rest: { method: 'GET', path: '/matches/:matchId' }
});

// ─── match_update ────────────────────────────────────────────────────────────

export const MatchUpdateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    name: z.string().optional().describe("Updated match name"),
    description: z.string().optional().describe("Updated description"),
    maxTurns: z.number().optional().describe("Updated max turns")
});

export const matchUpdateContract = defineContract({
    domain: 'match',
    action: 'update',
    description: 'Update match operational parameters.',
    inputSchema: MatchUpdateInputSchema,
    outputSchema: MatchSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId' }
});

// ─── match_delete ────────────────────────────────────────────────────────────

export const MatchDeleteInputSchema = z.object({
    matchId: z.string().describe("The match ID to delete")
});

export const MatchDeleteOutputSchema = z.object({
    success: z.boolean().describe("Whether the deletion succeeded")
});

export const matchDeleteContract = defineContract({
    domain: 'match',
    action: 'delete',
    description: 'Terminate and purge an active match.',
    inputSchema: MatchDeleteInputSchema,
    outputSchema: MatchDeleteOutputSchema,
    rest: { method: 'DELETE', path: '/matches/:matchId' }
});

// ─── match_get_win_state ─────────────────────────────────────────────────────

export const MatchWinStateInputSchema = z.object({
    matchId: z.string().describe("The match ID")
});

export const MatchWinStateOutputSchema = z.object({
    winType: z.string().describe("Victory condition outcome"),
    winReason: z.string().describe("Explanation of result"),
    score: z.object({
        blue: z.number(),
        red: z.number(),
        munitionsExpended: z.number()
    })
});

export const matchGetWinStateContract = defineContract({
    domain: 'match',
    action: 'get_win_state',
    description: 'Evaluate victory conditions for the current match state.',
    inputSchema: MatchWinStateInputSchema,
    outputSchema: MatchWinStateOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/win-state' }
});

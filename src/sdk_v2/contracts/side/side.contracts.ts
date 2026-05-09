import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { SideSchema } from '../domain/primitives.schema.js';
import { ROESchema } from '../domain/tactical.schema.js';
import { EMCONStateSchema } from '../domain/sensor.schema.js';

// ─── side_get_roe ────────────────────────────────────────────────────────────

export const SideGetROEInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    side: SideSchema.describe("The side to query")
});

export const SideGetROEOutputSchema = z.object({
    side: SideSchema.describe("Side queried"),
    roe: z.string().describe("Current ROE"),
    emcon: z.string().describe("Current EMCON state")
});

export const sideGetROEContract = defineContract({
    domain: 'side',
    action: 'get_roe',
    description: 'Retrieve the current ROE and EMCON for a side.',
    inputSchema: SideGetROEInputSchema,
    outputSchema: SideGetROEOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/sides/:side/roe' }
});

// ─── side_update_roe ─────────────────────────────────────────────────────────

export const SideUpdateROEInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    side: SideSchema.describe("The side to update"),
    roe: z.string().optional().describe("New ROE"),
    emcon: z.string().optional().describe("New EMCON state")
});

export const sideUpdateROEContract = defineContract({
    domain: 'side',
    action: 'update_roe',
    description: 'Update side-wide Rules of Engagement.',
    inputSchema: SideUpdateROEInputSchema,
    outputSchema: SideGetROEOutputSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/sides/:side/roe' }
});

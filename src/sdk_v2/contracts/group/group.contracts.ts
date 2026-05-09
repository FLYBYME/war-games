import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { GroupFormationSchema } from '../domain/tactical.schema.js';

// ─── Group State ─────────────────────────────────────────────────────────────

export const GroupStateSchema = z.object({
    groupId: z.string().describe("Group identifier"),
    leaderId: z.string().describe("Leader entity ID"),
    memberIds: z.array(z.string()).describe("Member entity IDs"),
    formation: GroupFormationSchema.describe("Formation type"),
    spacingM: z.number().describe("Spacing between members in meters")
}).describe("Tactical group state");

// ─── group_list ──────────────────────────────────────────────────────────────

export const GroupListInputSchema = z.object({
    matchId: z.string().describe("The match ID")
});

export const GroupListOutputSchema = z.object({
    groups: z.array(GroupStateSchema).describe("All tactical groups")
});

export const groupListContract = defineContract({
    domain: 'group',
    action: 'list',
    description: 'List all tactical groups in the match.',
    inputSchema: GroupListInputSchema,
    outputSchema: GroupListOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/groups' }
});

// ─── group_get ───────────────────────────────────────────────────────────────

export const GroupGetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    groupId: z.string().describe("The group ID")
});

export const groupGetContract = defineContract({
    domain: 'group',
    action: 'get',
    description: 'Get details of a specific tactical group.',
    inputSchema: GroupGetInputSchema,
    outputSchema: GroupStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/groups/:groupId' }
});

// ─── group_create ────────────────────────────────────────────────────────────

export const GroupCreateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    groupId: z.string().describe("Group identifier"),
    leaderId: z.string().describe("Leader entity ID"),
    memberIds: z.array(z.string()).describe("Member entity IDs"),
    formation: GroupFormationSchema.optional().describe("Initial formation type"),
    spacingM: z.number().optional().default(500).describe("Spacing between members")
});

export const groupCreateContract = defineContract({
    domain: 'group',
    action: 'create',
    description: 'Create a new tactical group.',
    inputSchema: GroupCreateInputSchema,
    outputSchema: GroupStateSchema,
    rest: { method: 'POST', path: '/matches/:matchId/groups' }
});

// ─── group_set_leader ────────────────────────────────────────────────────────

export const GroupSetLeaderInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    groupId: z.string().describe("The group ID"),
    leaderId: z.string().describe("New leader entity ID")
});

export const groupSetLeaderContract = defineContract({
    domain: 'group',
    action: 'set_leader',
    description: 'Reassign the group leader.',
    inputSchema: GroupSetLeaderInputSchema,
    outputSchema: GroupStateSchema,
    rest: { method: 'PUT', path: '/matches/:matchId/groups/:groupId/leader' }
});

// ─── group_set_parameters ────────────────────────────────────────────────────

export const GroupSetParametersInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    groupId: z.string().describe("The group ID"),
    formation: GroupFormationSchema.optional().describe("New formation type"),
    spacingM: z.number().optional().describe("New spacing in meters")
});

export const groupSetParametersContract = defineContract({
    domain: 'group',
    action: 'set_parameters',
    description: 'Adjust group formation and spacing.',
    inputSchema: GroupSetParametersInputSchema,
    outputSchema: GroupStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/groups/:groupId/parameters' }
});

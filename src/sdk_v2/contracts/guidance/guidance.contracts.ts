import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { GuidanceTypeSchema } from '../domain/tactical.schema.js';

// ─── Guidance State ──────────────────────────────────────────────────────────

export const GuidanceComponentTypeSchema = z.enum([
    'SARH', 'ARH', 'IR', 'Command', 'INS', 'GPS'
]).describe("Seeker guidance type");

export const GuidanceStateSchema = z.object({
    entityId: z.string().describe("Weapon entity ID"),
    guidanceType: GuidanceComponentTypeSchema.describe("Active seeker type"),
    targetId: z.string().describe("Current track being followed"),
    hasLock: z.boolean().describe("Whether seeker has a valid lock"),
    lastLockTick: z.number().describe("Last tick when lock was held"),
    maneuverabilityG: z.number().describe("Maximum seeker G-limit"),
    illuminatorId: z.string().optional().describe("SARH illuminator entity ID")
}).describe("Weapon guidance system state");

// ─── guidance_get ────────────────────────────────────────────────────────────

export const GuidanceGetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The weapon entity ID")
});

export const guidanceGetContract = defineContract({
    domain: 'guidance',
    action: 'get',
    description: 'Inspect lock-on status, seeker type, and current track.',
    inputSchema: GuidanceGetInputSchema,
    outputSchema: GuidanceStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/guidance' }
});

// ─── guidance_update ─────────────────────────────────────────────────────────

export const GuidanceUpdateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The weapon entity ID"),
    maneuverabilityG: z.number().optional().describe("New G-limit"),
    guidanceType: GuidanceComponentTypeSchema.optional().describe("Switch seeker type")
});

export const guidanceUpdateContract = defineContract({
    domain: 'guidance',
    action: 'update',
    description: 'Adjust seeker sensitivity or maneuverability.',
    inputSchema: GuidanceUpdateInputSchema,
    outputSchema: GuidanceStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/guidance' }
});

// ─── guidance_set_target ─────────────────────────────────────────────────────

export const GuidanceSetTargetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The weapon entity ID"),
    targetId: z.string().describe("New target entity/track ID")
});

export const GuidanceSetTargetOutputSchema = z.object({
    success: z.boolean().describe("Whether target was reassigned"),
    targetId: z.string().describe("New target ID")
});

export const guidanceSetTargetContract = defineContract({
    domain: 'guidance',
    action: 'set_target',
    description: 'Override the seeker\'s target for mid-course guidance.',
    inputSchema: GuidanceSetTargetInputSchema,
    outputSchema: GuidanceSetTargetOutputSchema,
    rest: { method: 'PUT', path: '/matches/:matchId/entities/:entityId/guidance/target' }
});

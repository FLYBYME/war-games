import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';

// ─── Propulsion State ────────────────────────────────────────────────────────

export const EngineStateEnumSchema = z.enum(['Off', 'Starting', 'Dry', 'Afterburner']).describe("Engine state");

export const PropulsionStateSchema = z.object({
    entityId: z.string().describe("Entity ID"),
    throttle: z.number().min(0).max(1).describe("Throttle position (0-1)"),
    currentThrustN: z.number().describe("Current thrust in Newtons"),
    maxThrustDryN: z.number().describe("Max dry thrust"),
    maxThrustAbN: z.number().describe("Max afterburner thrust"),
    engineState: EngineStateEnumSchema.describe("Current engine state"),
    sfcDry: z.number().describe("Specific fuel consumption (dry)"),
    sfcAb: z.number().describe("Specific fuel consumption (AB)")
}).describe("Propulsion system state");

// ─── propulsion_get ──────────────────────────────────────────────────────────

export const PropulsionGetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const propulsionGetContract = defineContract({
    domain: 'propulsion',
    action: 'get',
    description: 'Fetch real-time throttle, thrust, and engine state.',
    inputSchema: PropulsionGetInputSchema,
    outputSchema: PropulsionStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/propulsion' }
});

// ─── propulsion_update ───────────────────────────────────────────────────────

export const PropulsionUpdateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    throttle: z.number().min(0).max(1).optional().describe("New throttle position")
});

export const propulsionUpdateContract = defineContract({
    domain: 'propulsion',
    action: 'update',
    description: 'Adjust throttle or toggle afterburners.',
    inputSchema: PropulsionUpdateInputSchema,
    outputSchema: PropulsionStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/propulsion' }
});

// ─── propulsion_set_state ────────────────────────────────────────────────────

export const PropulsionSetStateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    state: EngineStateEnumSchema.describe("Desired engine state")
});

export const propulsionSetStateContract = defineContract({
    domain: 'propulsion',
    action: 'set_state',
    description: 'Command engine startup, shutdown, or emergency cutoff.',
    inputSchema: PropulsionSetStateInputSchema,
    outputSchema: PropulsionStateSchema,
    rest: { method: 'PUT', path: '/matches/:matchId/entities/:entityId/propulsion/state' }
});

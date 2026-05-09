import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';

// ─── Datalink State ──────────────────────────────────────────────────────────

export const DatalinkStateSchema = z.object({
    entityId: z.string().describe("Entity ID"),
    networkId: z.string().describe("Active network ID"),
    isActive: z.boolean().describe("Whether datalink is active"),
    canTransmit: z.boolean().describe("Transmission capability"),
    canReceive: z.boolean().describe("Reception capability"),
    latencyMs: z.number().describe("Current network latency"),
    queueDepth: z.number().describe("Pending messages in queue")
}).describe("Datalink system state");

// ─── datalink_get ────────────────────────────────────────────────────────────

export const DatalinkGetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const datalinkGetContract = defineContract({
    domain: 'datalink',
    action: 'get',
    description: 'View latency, queue depth, and current network membership.',
    inputSchema: DatalinkGetInputSchema,
    outputSchema: DatalinkStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/datalink' }
});

// ─── datalink_update_network ─────────────────────────────────────────────────

export const DatalinkUpdateNetworkInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    networkId: z.string().describe("Target network ID")
});

export const datalinkUpdateNetworkContract = defineContract({
    domain: 'datalink',
    action: 'update_network',
    description: 'Move an entity to a different tactical network.',
    inputSchema: DatalinkUpdateNetworkInputSchema,
    outputSchema: DatalinkStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/datalink/network' }
});

// ─── datalink_set_emissions ──────────────────────────────────────────────────

export const DatalinkSetEmissionsInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    isActive: z.boolean().optional().describe("Toggle overall activity"),
    canTransmit: z.boolean().optional().describe("Toggle transmit"),
    canReceive: z.boolean().optional().describe("Toggle receive")
});

export const datalinkSetEmissionsContract = defineContract({
    domain: 'datalink',
    action: 'set_emissions',
    description: 'Manage datalink emission levels for stealth operations.',
    inputSchema: DatalinkSetEmissionsInputSchema,
    outputSchema: DatalinkStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/datalink/emissions' }
});

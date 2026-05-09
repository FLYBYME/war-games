import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { EMBandSchema } from '../domain/sensor.schema.js';

// ─── Signature State ─────────────────────────────────────────────────────────

export const SignatureStateSchema = z.object({
    entityId: z.string().describe("Entity ID"),
    baseRCS: z.number().describe("Base Radar Cross Section in m²"),
    effectiveRCS: z.number().describe("Effective RCS after modifiers"),
    frontalMultiplier: z.number().describe("Frontal aspect RCS multiplier"),
    sideMultiplier: z.number().describe("Side aspect RCS multiplier"),
    rearMultiplier: z.number().describe("Rear aspect RCS multiplier"),
    bandMultipliers: z.array(z.object({
        band: EMBandSchema,
        multiplier: z.number()
    })).describe("Frequency-dependent RCS multipliers"),
    acousticSL: z.number().optional().describe("Acoustic Source Level in dB (naval only)")
}).describe("Observable signature state");

// ─── Countermeasure Inventory ────────────────────────────────────────────────

export const CountermeasureTypeSchema = z.enum([
    'Chaff', 'Flare', 'AcousticDecoy', 'TowedDecoy'
]).describe("Countermeasure type");

export const CountermeasureInventorySchema = z.object({
    type: CountermeasureTypeSchema.describe("CM type"),
    remaining: z.number().describe("Remaining count"),
    total: z.number().describe("Total capacity")
}).describe("Countermeasure inventory");

// ─── signature_get ───────────────────────────────────────────────────────────

export const SignatureGetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const signatureGetContract = defineContract({
    domain: 'signature',
    action: 'get',
    description: 'Fetch RCS, IR, and acoustic signatures.',
    inputSchema: SignatureGetInputSchema,
    outputSchema: SignatureStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/signature' }
});

// ─── signature_update ────────────────────────────────────────────────────────

export const SignatureUpdateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    baseRCS: z.number().optional().describe("Override base RCS"),
    frontalMultiplier: z.number().optional().describe("Override frontal multiplier"),
    acousticSL: z.number().optional().describe("Override acoustic source level")
});

export const signatureUpdateContract = defineContract({
    domain: 'signature',
    action: 'update',
    description: 'Apply signature modifiers (e.g., stealth configuration).',
    inputSchema: SignatureUpdateInputSchema,
    outputSchema: SignatureStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/signature' }
});

// ─── cm_deploy ───────────────────────────────────────────────────────────────

export const CMDeployInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    type: CountermeasureTypeSchema.describe("CM type to deploy"),
    quantity: z.number().optional().default(1).describe("Number to deploy")
});

export const CMDeployOutputSchema = z.object({
    success: z.boolean().describe("Whether deployment succeeded"),
    remaining: z.number().describe("Remaining count of that type")
});

export const cmDeployContract = defineContract({
    domain: 'cm',
    action: 'deploy',
    description: 'Deploy chaff, flares, or acoustic decoys.',
    inputSchema: CMDeployInputSchema,
    outputSchema: CMDeployOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/entities/:entityId/countermeasures/deploy' }
});

// ─── cm_get_inventory ────────────────────────────────────────────────────────

export const CMGetInventoryInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const CMGetInventoryOutputSchema = z.object({
    inventory: z.array(CountermeasureInventorySchema).describe("CM inventory")
});

export const cmGetInventoryContract = defineContract({
    domain: 'cm',
    action: 'get_inventory',
    description: 'Check remaining countermeasure expendables.',
    inputSchema: CMGetInventoryInputSchema,
    outputSchema: CMGetInventoryOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/countermeasures' }
});

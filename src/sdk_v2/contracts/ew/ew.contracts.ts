import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { EMBandSchema } from '../domain/sensor.schema.js';

// ─── EW Jammer State ─────────────────────────────────────────────────────────

export const JammerModeSchema = z.enum(['Noise', 'Deceptive']).describe("Jammer operating mode");
export const JammerTypeSchema = z.enum(['SOJ', 'SPJ', 'EA']).describe("Jammer deployment type");

export const JammerStateSchema = z.object({
    isActive: z.boolean().describe("Whether jammer is radiating"),
    mode: JammerModeSchema.describe("Operating mode"),
    jammerType: JammerTypeSchema.describe("Deployment type"),
    powerKw: z.number().describe("Transmit power in kilowatts"),
    bandwidthMhz: z.number().describe("Jamming bandwidth in MHz"),
    band: EMBandSchema.describe("Target frequency band"),
    targetId: z.string().optional().describe("Directed jamming target ID")
}).describe("Jammer system state");

// ─── ew_get_jammer ───────────────────────────────────────────────────────────

export const EWGetJammerInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const ewGetJammerContract = defineContract({
    domain: 'ew',
    action: 'get_jammer',
    description: 'Fetch current jammer power, frequency, and beam settings.',
    inputSchema: EWGetJammerInputSchema,
    outputSchema: JammerStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/ew/jammer' }
});

// ─── ew_set_jammer_state ─────────────────────────────────────────────────────

export const EWSetJammerStateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    isActive: z.boolean().optional().describe("Toggle jammer"),
    mode: JammerModeSchema.optional().describe("Set mode"),
    jammerType: JammerTypeSchema.optional().describe("Set type"),
    powerKw: z.number().optional().describe("Set power")
});

export const ewSetJammerStateContract = defineContract({
    domain: 'ew',
    action: 'set_jammer_state',
    description: 'Toggle jammer active state, mode, or type.',
    inputSchema: EWSetJammerStateInputSchema,
    outputSchema: JammerStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/ew/jammer/state' }
});

// ─── ew_assign_jammer_target ─────────────────────────────────────────────────

export const EWAssignJammerTargetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    targetId: z.string().describe("Target entity ID to jam")
});

export const EWAssignJammerTargetOutputSchema = z.object({
    success: z.boolean().describe("Whether assignment succeeded"),
    targetId: z.string().describe("Assigned target")
});

export const ewAssignJammerTargetContract = defineContract({
    domain: 'ew',
    action: 'assign_jammer_target',
    description: 'Point a directional jammer at a specific target.',
    inputSchema: EWAssignJammerTargetInputSchema,
    outputSchema: EWAssignJammerTargetOutputSchema,
    rest: { method: 'PUT', path: '/matches/:matchId/entities/:entityId/ew/jammer/target' }
});

// ─── ew_get_sigint ───────────────────────────────────────────────────────────

export const SIGINTStateSchema = z.object({
    sensitivityDBm: z.number().describe("Receiver sensitivity in dBm"),
    detectedEmitters: z.array(z.object({
        emitterId: z.string().describe("Emitting entity ID"),
        bearing: z.number().describe("Bearing to emitter in degrees"),
        signalStrengthDBm: z.number().describe("Received signal strength"),
        band: EMBandSchema.describe("Frequency band")
    })).describe("Detected electromagnetic emitters")
}).describe("SIGINT receiver state");

export const EWGetSIGINTInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const ewGetSIGINTContract = defineContract({
    domain: 'ew',
    action: 'get_sigint',
    description: 'Retrieve SIGINT data (localized jammer/emitter detections).',
    inputSchema: EWGetSIGINTInputSchema,
    outputSchema: SIGINTStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/ew/sigint' }
});

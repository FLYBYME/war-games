import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';

// ─── Logistics State ─────────────────────────────────────────────────────────

export const LogisticsStateSchema = z.object({
    entityId: z.string().describe("Entity ID"),
    fuelCurrentKg: z.number().describe("Current fuel in kg"),
    fuelMaxKg: z.number().describe("Maximum fuel capacity in kg"),
    fuelPct: z.number().describe("Fuel percentage (0-1)"),
    isBingo: z.boolean().describe("Whether fuel is critically low"),
    burnRateKgHr: z.number().describe("Current burn rate in kg/hr"),
    hp: z.number().describe("Current hit points"),
    maxHp: z.number().describe("Maximum hit points"),
    logisticsState: z.string().describe("Turnaround state"),
    subsystems: z.array(z.object({
        id: z.string().describe("Subsystem ID"),
        name: z.string().describe("Subsystem name"),
        hp: z.number().describe("Current HP"),
        maxHp: z.number().describe("Max HP"),
        isOperational: z.boolean().describe("Whether functional")
    })).describe("Subsystem health states"),
    magazines: z.array(z.object({
        name: z.string().describe("Magazine name"),
        weaponType: z.string().describe("Weapon profile ID"),
        remaining: z.number().describe("Rounds remaining"),
        capacity: z.number().describe("Total capacity")
    })).describe("Ammunition magazines")
}).describe("Full logistics and health state");

// ─── logistics_get ───────────────────────────────────────────────────────────

export const LogisticsGetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const logisticsGetContract = defineContract({
    domain: 'logistics',
    action: 'get',
    description: 'Check fuel, ammo, and structural integrity.',
    inputSchema: LogisticsGetInputSchema,
    outputSchema: LogisticsStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/logistics' }
});

// ─── logistics_update_state ──────────────────────────────────────────────────

export const LogisticsUpdateStateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    fuelKg: z.number().optional().describe("Set fuel level in kg"),
    hp: z.number().optional().describe("Set HP")
});

export const logisticsUpdateStateContract = defineContract({
    domain: 'logistics',
    action: 'update_state',
    description: 'Manually set fuel or health levels.',
    inputSchema: LogisticsUpdateStateInputSchema,
    outputSchema: LogisticsStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/logistics/state' }
});

// ─── logistics_transfer ──────────────────────────────────────────────────────

export const LogisticsTransferInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    fromId: z.string().describe("Source entity ID"),
    toId: z.string().describe("Recipient entity ID"),
    fuelKg: z.number().describe("Fuel to transfer in kg")
});

export const LogisticsTransferOutputSchema = z.object({
    success: z.boolean().describe("Whether transfer succeeded"),
    fromFuelKg: z.number().describe("Source remaining fuel"),
    toFuelKg: z.number().describe("Recipient new fuel level")
});

export const logisticsTransferContract = defineContract({
    domain: 'logistics',
    action: 'transfer',
    description: 'Transfer fuel between two entities.',
    inputSchema: LogisticsTransferInputSchema,
    outputSchema: LogisticsTransferOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/logistics/transfer' }
});

// ─── logistics_apply_damage ──────────────────────────────────────────────────

export const LogisticsApplyDamageInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    damage: z.number().describe("Damage amount to apply")
});

export const LogisticsApplyDamageOutputSchema = z.object({
    entityId: z.string().describe("Entity ID"),
    newHp: z.number().describe("Remaining HP"),
    isDestroyed: z.boolean().describe("Whether entity was destroyed")
});

export const logisticsApplyDamageContract = defineContract({
    domain: 'logistics',
    action: 'apply_damage',
    description: 'Apply damage to a unit.',
    inputSchema: LogisticsApplyDamageInputSchema,
    outputSchema: LogisticsApplyDamageOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/entities/:entityId/logistics/damage' }
});

// ─── logistics_land ──────────────────────────────────────────────────────────

export const LogisticsLandInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The aircraft ID"),
    facilityId: z.string().describe("The destination facility ID")
});

export const LogisticsLandOutputSchema = z.object({
    success: z.boolean().describe("Whether landing was initiated"),
    newState: z.string().describe("New logistics state")
});

export const logisticsLandContract = defineContract({
    domain: 'logistics',
    action: 'land',
    description: 'Initiate a recovery sequence at a facility.',
    inputSchema: LogisticsLandInputSchema,
    outputSchema: LogisticsLandOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/entities/:entityId/logistics/land' }
});

// ─── logistics_launch ────────────────────────────────────────────────────────

export const LogisticsLaunchInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The aircraft ID to launch")
});

export const LogisticsLaunchOutputSchema = z.object({
    success: z.boolean().describe("Whether launch was initiated"),
    newState: z.string().describe("New logistics state")
});

export const logisticsLaunchContract = defineContract({
    domain: 'logistics',
    action: 'launch',
    description: 'Launch a stored unit from its parent platform.',
    inputSchema: LogisticsLaunchInputSchema,
    outputSchema: LogisticsLaunchOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/entities/:entityId/logistics/launch' }
});

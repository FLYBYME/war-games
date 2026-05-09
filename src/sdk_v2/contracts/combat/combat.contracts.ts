import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { WRARuleSchema } from '../domain/tactical.schema.js';

// ─── Shared Combat State ─────────────────────────────────────────────────────

export const MountStateSchema = z.object({
    index: z.number().describe("Mount index"),
    name: z.string().describe("Mount name"),
    weaponType: z.string().describe("Weapon profile ID"),
    roundsRemaining: z.number().describe("Rounds remaining in magazine"),
    currentAzimuth: z.number().describe("Current azimuth angle in degrees"),
    currentElevation: z.number().describe("Current elevation angle in degrees"),
    isReloading: z.boolean().describe("Whether currently reloading"),
    reloadTicksRemaining: z.number().describe("Ticks until reload completes")
}).describe("Weapon mount state");

export const CombatStateSchema = z.object({
    entityId: z.string().describe("Entity ID"),
    mounts: z.array(MountStateSchema).describe("Weapon mount states"),
    targetId: z.string().optional().describe("Primary engagement target"),
    roe: z.string().describe("Current ROE"),
    wraRules: z.array(WRARuleSchema).describe("Active WRA rules")
}).describe("Full combat state");

// ─── combat_get ──────────────────────────────────────────────────────────────

export const CombatGetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const combatGetContract = defineContract({
    domain: 'combat',
    action: 'get',
    description: 'View current engagement targets, weapon status, and ammo counts.',
    inputSchema: CombatGetInputSchema,
    outputSchema: CombatStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/combat' }
});

// ─── combat_fire ─────────────────────────────────────────────────────────────

export const CombatFireInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The shooter entity ID"),
    mountIndex: z.number().describe("Weapon mount index to fire"),
    targetId: z.string().describe("Target entity or track ID")
});

export const CombatFireOutputSchema = z.object({
    success: z.boolean().describe("Whether the weapon was fired"),
    munitionId: z.string().optional().describe("Spawned munition entity ID")
});

export const combatFireContract = defineContract({
    domain: 'combat',
    action: 'fire',
    description: 'Fire a weapon at a specific target.',
    inputSchema: CombatFireInputSchema,
    outputSchema: CombatFireOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/entities/:entityId/combat/fire' }
});

// ─── combat_fire_salvo ───────────────────────────────────────────────────────

export const CombatFireSalvoInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The shooter entity ID"),
    mountIndex: z.number().describe("Weapon mount index"),
    targetId: z.string().describe("Target entity or track ID"),
    quantity: z.number().describe("Number of rounds in salvo")
});

export const CombatFireSalvoOutputSchema = z.object({
    success: z.boolean().describe("Whether the salvo was launched"),
    munitionIds: z.array(z.string()).describe("Spawned munition entity IDs")
});

export const combatFireSalvoContract = defineContract({
    domain: 'combat',
    action: 'fire_salvo',
    description: 'Execute a multi-weapon salvo.',
    inputSchema: CombatFireSalvoInputSchema,
    outputSchema: CombatFireSalvoOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/entities/:entityId/combat/salvo' }
});

// ─── combat_list_mounts ──────────────────────────────────────────────────────

export const CombatListMountsInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const CombatListMountsOutputSchema = z.object({
    mounts: z.array(MountStateSchema).describe("All weapon mounts")
});

export const combatListMountsContract = defineContract({
    domain: 'combat',
    action: 'list_mounts',
    description: 'Inspect turret/launcher configurations.',
    inputSchema: CombatListMountsInputSchema,
    outputSchema: CombatListMountsOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/combat/mounts' }
});

// ─── combat_get_wra ──────────────────────────────────────────────────────────

export const CombatGetWRAInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const CombatGetWRAOutputSchema = z.object({
    rules: z.array(WRARuleSchema).describe("Active WRA rules")
});

export const combatGetWRAContract = defineContract({
    domain: 'combat',
    action: 'get_wra',
    description: 'Retrieve Weapon Release Authority settings.',
    inputSchema: CombatGetWRAInputSchema,
    outputSchema: CombatGetWRAOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/combat/wra' }
});

// ─── combat_update_wra ───────────────────────────────────────────────────────

export const CombatUpdateWRAInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    rules: z.array(WRARuleSchema).describe("New WRA rules")
});

export const combatUpdateWRAContract = defineContract({
    domain: 'combat',
    action: 'update_wra',
    description: 'Update automated engagement constraints.',
    inputSchema: CombatUpdateWRAInputSchema,
    outputSchema: CombatGetWRAOutputSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/combat/wra' }
});

// ─── combat_update_roe ───────────────────────────────────────────────────────

export const CombatUpdateROEInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID"),
    roe: z.string().describe("New ROE (Free, Tight, Hold)")
});

export const CombatUpdateROEOutputSchema = z.object({
    entityId: z.string().describe("Entity ID"),
    roe: z.string().describe("Updated ROE")
});

export const combatUpdateROEContract = defineContract({
    domain: 'combat',
    action: 'update_roe',
    description: 'Override unit-specific Rules of Engagement.',
    inputSchema: CombatUpdateROEInputSchema,
    outputSchema: CombatUpdateROEOutputSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/entities/:entityId/combat/roe' }
});

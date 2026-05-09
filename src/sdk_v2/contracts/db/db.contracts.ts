import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { EntityProfileSchema, WeaponProfileSchema, PlatformTypeSchema } from '../domain/tactical.schema.js';
import { ScenarioManifestSchema } from '../domain/scenarios.schema.js';

// ─── db_profile_list ─────────────────────────────────────────────────────────

export const DBProfileListInputSchema = z.object({
    type: PlatformTypeSchema.optional().describe("Filter by platform type"),
    page: z.number().optional().default(1).describe("Page number"),
    pageSize: z.number().optional().default(50).describe("Items per page")
});

export const DBProfileListOutputSchema = z.object({
    profiles: z.array(z.object({
        id: z.string().describe("Profile ID"),
        name: z.string().describe("Profile name"),
        type: z.string().describe("Platform type"),
        platformClass: z.string().optional().describe("Platform class")
    })).describe("Profile summaries"),
    totalCount: z.number().describe("Total profiles")
});

export const dbProfileListContract = defineContract({
    domain: 'db',
    action: 'profile_list',
    description: 'List all available unit profiles.',
    inputSchema: DBProfileListInputSchema,
    outputSchema: DBProfileListOutputSchema,
    rest: { method: 'GET', path: '/db/profiles' }
});

// ─── db_profile_get ──────────────────────────────────────────────────────────

export const DBProfileGetInputSchema = z.object({
    id: z.string().describe("Profile ID")
});

export const dbProfileGetContract = defineContract({
    domain: 'db',
    action: 'profile_get',
    description: 'Retrieve the full specification for a unit type.',
    inputSchema: DBProfileGetInputSchema,
    outputSchema: EntityProfileSchema,
    rest: { method: 'GET', path: '/db/profiles/:id' }
});

// ─── db_profile_create ───────────────────────────────────────────────────────

export const DBProfileCreateInputSchema = z.object({
    id: z.string().describe("Profile ID"),
    profile: EntityProfileSchema.describe("Profile definition")
});

export const DBProfileCreateOutputSchema = z.object({
    id: z.string().describe("Created profile ID"),
    success: z.boolean().describe("Whether creation succeeded")
});

export const dbProfileCreateContract = defineContract({
    domain: 'db',
    action: 'profile_create',
    description: 'Add a new unit definition to the registry.',
    inputSchema: DBProfileCreateInputSchema,
    outputSchema: DBProfileCreateOutputSchema,
    rest: { method: 'POST', path: '/db/profiles' }
});

// ─── db_weapon_list ──────────────────────────────────────────────────────────

export const DBWeaponListInputSchema = z.object({
    type: z.enum(['Missile', 'Torpedo', 'Gun', 'Bomb']).optional().describe("Filter by weapon type")
});

export const DBWeaponListOutputSchema = z.object({
    weapons: z.array(z.object({
        id: z.string().describe("Weapon profile ID"),
        name: z.string().describe("Weapon name"),
        type: z.string().describe("Weapon type"),
        maxRangeM: z.number().describe("Maximum range")
    })).describe("Weapon summaries"),
    totalCount: z.number().describe("Total weapons")
});

export const dbWeaponListContract = defineContract({
    domain: 'db',
    action: 'weapon_list',
    description: 'List all modeled weapon systems.',
    inputSchema: DBWeaponListInputSchema,
    outputSchema: DBWeaponListOutputSchema,
    rest: { method: 'GET', path: '/db/weapons' }
});

// ─── db_weapon_get ───────────────────────────────────────────────────────────

export const DBWeaponGetInputSchema = z.object({
    id: z.string().describe("Weapon profile ID")
});

export const dbWeaponGetContract = defineContract({
    domain: 'db',
    action: 'weapon_get',
    description: 'Fetch weapon performance envelopes and seeker specs.',
    inputSchema: DBWeaponGetInputSchema,
    outputSchema: WeaponProfileSchema,
    rest: { method: 'GET', path: '/db/weapons/:id' }
});

// ─── db_scenario_list ────────────────────────────────────────────────────────

export const DBScenarioListInputSchema = z.object({
    page: z.number().optional().default(1).describe("Page number"),
    pageSize: z.number().optional().default(20).describe("Items per page")
});

export const DBScenarioListOutputSchema = z.object({
    scenarios: z.array(z.object({
        id: z.string().describe("Scenario ID"),
        name: z.string().describe("Scenario name"),
        description: z.string().optional().describe("Scenario description"),
        entityCount: z.number().describe("Number of entities")
    })).describe("Scenario summaries"),
    totalCount: z.number().describe("Total scenarios")
});

export const dbScenarioListContract = defineContract({
    domain: 'db',
    action: 'scenario_list',
    description: 'List all stored scenario templates.',
    inputSchema: DBScenarioListInputSchema,
    outputSchema: DBScenarioListOutputSchema,
    rest: { method: 'GET', path: '/db/scenarios' }
});

// ─── db_scenario_get ─────────────────────────────────────────────────────────

export const DBScenarioGetInputSchema = z.object({
    id: z.string().describe("Scenario ID")
});

export const dbScenarioGetContract = defineContract({
    domain: 'db',
    action: 'scenario_get',
    description: 'Retrieve the full manifest for a specific scenario template.',
    inputSchema: DBScenarioGetInputSchema,
    outputSchema: ScenarioManifestSchema,
    rest: { method: 'GET', path: '/db/scenarios/:id' }
});

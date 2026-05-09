import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { Vector3Schema, SideSchema, EntityIdSchema } from '../domain/primitives.schema.js';
import { MissionSchema } from '../domain/tactical.schema.js';

// ─── Shared Entity Output Schema ─────────────────────────────────────────────

export const EntitySummarySchema = z.object({
    id: EntityIdSchema.describe("Entity ID"),
    side: SideSchema.describe("Faction"),
    profileId: z.string().optional().describe("Profile used to create entity"),
    category: z.string().optional().describe("Platform category"),
    parentId: EntityIdSchema.optional().describe("Parent entity ID"),
    position: Vector3Schema.describe("Current position"),
    heading: z.number().describe("Current heading in degrees"),
    speedKts: z.number().describe("Current speed in knots"),
    hp: z.number().describe("Current hit points"),
    isDestroyed: z.boolean().describe("Whether entity is destroyed"),
    fuelPct: z.number().describe("Fuel percentage (0-1)"),
    mission: MissionSchema.optional().describe("Current mission")
}).describe("Summary of a single entity");

// ─── entity_list ─────────────────────────────────────────────────────────────

export const EntityListInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    side: SideSchema.optional().describe("Filter by side"),
    category: z.string().optional().describe("Filter by category")
});

export const EntityListOutputSchema = z.object({
    entities: z.array(EntitySummarySchema).describe("List of entities"),
    totalCount: z.number().describe("Total entity count")
});

export const entityListContract = defineContract({
    domain: 'entity',
    action: 'list',
    description: 'List all entities in the match with optional filtering.',
    inputSchema: EntityListInputSchema,
    outputSchema: EntityListOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities' }
});

// ─── entity_get ──────────────────────────────────────────────────────────────

export const EntityGetInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const entityGetContract = defineContract({
    domain: 'entity',
    action: 'get',
    description: 'Retrieve the full component state of a single entity.',
    inputSchema: EntityGetInputSchema,
    outputSchema: EntitySummarySchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId' }
});

// ─── entity_create ───────────────────────────────────────────────────────────

export const EntityCreateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    id: z.string().optional().describe("Optional entity ID (auto-generated if omitted)"),
    profileId: z.string().describe("Platform profile ID"),
    side: SideSchema.describe("Faction assignment"),
    position: Vector3Schema.describe("Spawn position"),
    heading: z.number().describe("Initial heading in degrees"),
    speedKts: z.number().optional().describe("Initial speed in knots")
});

export const entityCreateContract = defineContract({
    domain: 'entity',
    action: 'create',
    description: 'Spawn a new entity into the simulation.',
    inputSchema: EntityCreateInputSchema,
    outputSchema: EntitySummarySchema,
    rest: { method: 'POST', path: '/matches/:matchId/entities' }
});

// ─── entity_delete ───────────────────────────────────────────────────────────

export const EntityDeleteInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID to remove")
});

export const EntityDeleteOutputSchema = z.object({
    success: z.boolean().describe("Whether the entity was removed")
});

export const entityDeleteContract = defineContract({
    domain: 'entity',
    action: 'delete',
    description: 'Remove an entity from the simulation.',
    inputSchema: EntityDeleteInputSchema,
    outputSchema: EntityDeleteOutputSchema,
    rest: { method: 'DELETE', path: '/matches/:matchId/entities/:entityId' }
});

// ─── entity_get_status ───────────────────────────────────────────────────────

export const EntityStatusInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    entityId: z.string().describe("The entity ID")
});

export const EntityStatusOutputSchema = z.object({
    id: EntityIdSchema,
    isAlive: z.boolean().describe("Whether entity is alive"),
    hp: z.number().describe("Current HP"),
    maxHp: z.number().describe("Maximum HP"),
    fuelPct: z.number().describe("Fuel percentage (0-1)"),
    isBingo: z.boolean().describe("Whether fuel is critically low"),
    logisticsState: z.string().describe("Current logistics state")
});

export const entityGetStatusContract = defineContract({
    domain: 'entity',
    action: 'get_status',
    description: 'Quick operational status check for an entity.',
    inputSchema: EntityStatusInputSchema,
    outputSchema: EntityStatusOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/entities/:entityId/status' }
});

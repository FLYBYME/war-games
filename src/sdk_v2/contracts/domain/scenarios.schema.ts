import { z } from 'zod';
import { Vector3Schema, SideSchema } from './primitives.schema.js';
import { EntityProfileSchema, WeaponProfileSchema, MissionTypeSchema, MissionParamsSchema, ROESchema, GroupFormationSchema, TurnaroundStateSchema, TurnaroundState, WRARuleSchema } from './tactical.schema.js';
import { EMCONStateSchema } from './sensor.schema.js';

// ─── Scenario Intents ────────────────────────────────────────────────────────

export const MissionIntentSchema = z.object({
    type: z.literal('Mission'),
    actorId: z.string().describe("Entity or Group ID"),
    missionType: MissionTypeSchema,
    params: MissionParamsSchema
}).describe("Assign a tactical mission to an actor");

export const DoctrineIntentSchema = z.object({
    type: z.literal('Doctrine'),
    actorId: z.string().optional().describe("Entity/Group ID. If omitted, applies to the side."),
    side: SideSchema.optional(),
    roe: ROESchema.optional(),
    emcon: EMCONStateSchema.optional(),
    wra: z.array(WRARuleSchema).optional().describe("Weapon Release Authority rules")
}).describe("Apply doctrine settings");

export const GroupIntentSchema = z.object({
    type: z.literal('Group'),
    groupId: z.string().describe("Group identifier"),
    leaderId: z.string().describe("Leader entity ID"),
    members: z.array(z.string()).describe("Member entity IDs"),
    formationType: GroupFormationSchema.optional().describe("Formation type")
}).describe("Create or modify a tactical group");

export const LogisticsIntentSchema = z.object({
    type: z.literal('Logistics'),
    baseId: z.string().describe("Facility entity ID"),
    hostedEntities: z.array(z.string()).describe("Entity IDs hosted at the facility"),
    initialState: TurnaroundStateSchema.optional().default(TurnaroundState.Ready).describe("Initial turnaround state")
}).describe("Configure logistics at a facility");

export const ScenarioIntentSchema = z.discriminatedUnion('type', [
    MissionIntentSchema,
    DoctrineIntentSchema,
    GroupIntentSchema,
    LogisticsIntentSchema
]).describe("High-level scenario automation intent");
export type ScenarioIntent = z.infer<typeof ScenarioIntentSchema>;

// ─── Scenario Triggers ───────────────────────────────────────────────────────

export const TickTriggerSchema = z.object({
    type: z.literal('tick'),
    tick: z.number().describe("Tick at which to trigger")
}).describe("Trigger at a specific simulation tick");

export const TacticalEventTriggerSchema = z.object({
    type: z.literal('tactical_event'),
    eventType: z.string().describe("Event type name to match"),
    filters: z.record(z.string()).optional().describe("Key-value filters on event data")
}).describe("Trigger on a specific tactical event");

export const ProximityTriggerSchema = z.object({
    type: z.literal('proximity'),
    entityId: z.string().describe("Observer entity ID"),
    targetId: z.string().describe("Target entity ID"),
    radiusM: z.number().describe("Trigger distance in meters")
}).describe("Trigger when entities come within range");

export const AreaTriggerSchema = z.object({
    type: z.literal('area'),
    entityId: z.string().describe("Entity to watch"),
    zone: z.object({
        x: z.number().describe("Zone center X"),
        y: z.number().describe("Zone center Y"),
        radius: z.number().describe("Zone radius in meters")
    }).describe("Circular zone")
}).describe("Trigger when entity enters area");

export const ConditionTriggerSchema = z.object({
    type: z.literal('condition'),
    entityId: z.string().describe("Entity to evaluate"),
    property: z.string().describe("Property name (e.g. 'hp_pct', 'fuel_pct', 'speed_kts')"),
    operator: z.enum(['<', '>', '==']).describe("Comparison operator"),
    value: z.number().describe("Threshold value")
}).describe("Trigger on entity property condition");

export const ScenarioTriggerSchema = z.discriminatedUnion('type', [
    TickTriggerSchema,
    TacticalEventTriggerSchema,
    ProximityTriggerSchema,
    AreaTriggerSchema,
    ConditionTriggerSchema
]).describe("Scenario automation trigger");
export type ScenarioTrigger = z.infer<typeof ScenarioTriggerSchema>;

// ─── Scenario Assertions ─────────────────────────────────────────────────────

export const ExistsAssertionSchema = z.object({
    type: z.literal('exists'),
    tick: z.number().optional(),
    trigger: ScenarioTriggerSchema.optional(),
    params: z.object({ entityId: z.string() })
}).describe("Assert an entity exists");

export const DeadAssertionSchema = z.object({
    type: z.literal('dead'),
    tick: z.number().optional(),
    trigger: ScenarioTriggerSchema.optional(),
    params: z.object({ entityId: z.string() })
}).describe("Assert an entity is destroyed");

export const SpeedAssertionSchema = z.object({
    type: z.literal('speed_at_least'),
    tick: z.number().optional(),
    trigger: ScenarioTriggerSchema.optional(),
    params: z.object({
        entityId: z.string(),
        speedKts: z.number()
    })
}).describe("Assert minimum speed");

export const PositionAssertionSchema = z.object({
    type: z.literal('pos_within'),
    tick: z.number().optional(),
    trigger: ScenarioTriggerSchema.optional(),
    params: z.object({
        entityId: z.string(),
        position: Vector3Schema,
        radiusM: z.number()
    })
}).describe("Assert entity within range of position");

export const EventOccurredAssertionSchema = z.object({
    type: z.literal('event_occurred'),
    event: z.string().describe("Event type that must have occurred"),
    byTick: z.number().optional().describe("Must occur by this tick"),
    params: z.record(z.string()).optional().describe("Event property filters")
}).describe("Assert a specific event occurred");

export const ScenarioAssertionSchema = z.discriminatedUnion('type', [
    ExistsAssertionSchema,
    DeadAssertionSchema,
    SpeedAssertionSchema,
    PositionAssertionSchema,
    EventOccurredAssertionSchema
]).describe("Scenario validation assertion");
export type ScenarioAssertion = z.infer<typeof ScenarioAssertionSchema>;

// ─── Scenario Entity ─────────────────────────────────────────────────────────

export const ScenarioEntitySchema = z.object({
    id: z.string().optional().describe("Entity ID (auto-generated if omitted)"),
    profileId: z.string().optional().describe("Reference to a named profile"),
    profile: EntityProfileSchema.optional().describe("Inline profile definition"),
    side: SideSchema.describe("Faction assignment"),
    pos: z.union([
        Vector3Schema,
        z.tuple([z.number(), z.number(), z.number()])
    ]).optional().describe("Position as Vector3 or [x, y, z] tuple"),
    position: Vector3Schema.optional().describe("Position as Vector3"),
    heading: z.number().optional().describe("Initial heading in degrees"),
    speedKts: z.number().optional().describe("Initial speed in knots")
}).refine(data => data.profileId !== undefined || data.profile !== undefined, {
    message: "Either profileId or profile must be provided",
    path: ["profileId"]
}).describe("An entity definition within a scenario template");
export type ScenarioEntity = z.infer<typeof ScenarioEntitySchema>;

// Forward declaration for circular reference avoidance:
// ScenarioEvent needs EngineCommandPayload, which is defined in commands.schema.ts
// We use a late-binding approach by importing the command schema

import { EngineCommandPayloadSchema } from './commands.schema.js';

/**
 * ScenarioEvent: A scripted command triggered by a scenario condition.
 */
export const ScenarioEventSchema = z.object({
    tick: z.number().optional().describe("Backward-compat tick trigger"),
    trigger: ScenarioTriggerSchema.optional().describe("Trigger condition"),
    command: z.lazy(() => EngineCommandPayloadSchema).describe("Command to execute when triggered")
}).describe("Scripted scenario event");
export type ScenarioEvent = z.infer<typeof ScenarioEventSchema>;

// ─── Scenario Manifest ───────────────────────────────────────────────────────

/**
 * ScenarioManifest: The complete definition of a tactical scenario.
 */
export const ScenarioManifestSchema = z.object({
    id: z.string().optional().describe("Scenario identifier"),
    name: z.string().describe("Scenario name"),
    description: z.string().optional().describe("Scenario description"),
    origin: z.object({
        lat: z.number().describe("Origin latitude in decimal degrees"),
        lon: z.number().describe("Origin longitude in decimal degrees")
    }).optional().describe("WGS84 origin for the meter-space projection"),
    entities: z.array(ScenarioEntitySchema).describe("Initial entity placements"),
    events: z.array(ScenarioEventSchema).optional().describe("Scripted events"),
    assertions: z.array(ScenarioAssertionSchema).optional().describe("Validation assertions"),
    intents: z.array(ScenarioIntentSchema).optional().describe("High-level tactical intents"),
    platformProfiles: z.record(EntityProfileSchema).optional().describe("Named platform profiles"),
    weaponProfiles: z.array(WeaponProfileSchema).optional().describe("Weapon system definitions")
}).describe("Complete scenario definition");
export type ScenarioManifest = z.infer<typeof ScenarioManifestSchema>;

// ─── World State ─────────────────────────────────────────────────────────────

export const SerializedComponentSchema = z.object({
    type: z.string().describe("Component type name"),
    data: z.record(z.string(), z.lazy((): z.ZodTypeAny => z.union([
        z.string(), z.number(), z.boolean(), z.null(),
        z.array(z.lazy((): z.ZodTypeAny => z.union([z.string(), z.number(), z.boolean(), z.null(), z.record(z.string(), z.lazy((): z.ZodTypeAny => z.union([z.string(), z.number(), z.boolean(), z.null()])))]))),
        z.record(z.string(), z.lazy((): z.ZodTypeAny => z.union([z.string(), z.number(), z.boolean(), z.null()])))
    ]))).describe("Serialized component data")
}).describe("A serialized ECS component");

export const WorldStateSchema = z.object({
    currentTick: z.number().describe("Current simulation tick"),
    seed: z.number().optional().describe("Random seed for deterministic replay"),
    entities: z.array(z.object({
        id: z.string().describe("Entity ID"),
        side: SideSchema,
        parentId: z.string().optional().describe("Parent entity ID"),
        components: z.array(z.object({
            type: z.string(),
            data: z.record(z.string(), z.lazy((): z.ZodTypeAny => z.union([
                z.string(), z.number(), z.boolean(), z.null(),
                z.array(z.lazy((): z.ZodTypeAny => z.union([z.string(), z.number(), z.boolean(), z.null()]))),
                z.record(z.string(), z.lazy((): z.ZodTypeAny => z.union([z.string(), z.number(), z.boolean(), z.null()])))
            ])))
        })).describe("Entity components")
    })).describe("All entities in the simulation")
}).describe("Full serialized world state");
export type WorldState = z.infer<typeof WorldStateSchema>;

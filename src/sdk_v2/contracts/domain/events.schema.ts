import { z } from 'zod';
import { EntityIdSchema, Vector3Schema, SideSchema } from './primitives.schema.js';
import { ViewStatePayloadSchema } from './viewstate.schema.js';

// ─── Simulation Events ──────────────────────────────────────────────────────

/**
 * BaseEventPayload: Fields shared by all simulation events.
 */
export const BaseEventPayloadSchema = z.object({
    tick: z.number().describe("Simulation tick when the event occurred"),
    entityId: EntityIdSchema.optional().describe("Primary entity involved"),
    targetId: EntityIdSchema.optional().describe("Secondary entity involved")
}).describe("Base simulation event fields");

/**
 * EntitySpawnedEvent: Emitted when a new entity enters the simulation.
 */
export const EntitySpawnedEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('EntitySpawned'),
    data: z.object({
        side: SideSchema,
        position: Vector3Schema,
        profileId: z.string().describe("Profile used to spawn the entity")
    })
}).describe("Entity spawned event");
export type EntitySpawnedEvent = z.infer<typeof EntitySpawnedEventSchema>;

/**
 * EntityDestroyedEvent: Emitted when an entity is destroyed or removed.
 */
export const EntityDestroyedEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('EntityDestroyed'),
    data: z.object({
        reason: z.string().optional().describe("Cause of destruction")
    })
}).describe("Entity destroyed event");
export type EntityDestroyedEvent = z.infer<typeof EntityDestroyedEventSchema>;

/**
 * WeaponFiredEvent: Emitted when a weapon is released from a mount.
 */
export const WeaponFiredEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('WeaponFired'),
    data: z.object({
        weaponProfileId: z.string().describe("Weapon profile used"),
        mountIndex: z.number().describe("Index of the mount that fired"),
        munitionId: z.string().optional().describe("ID of the spawned munition entity")
    })
}).describe("Weapon fired event");
export type WeaponFiredEvent = z.infer<typeof WeaponFiredEventSchema>;

/**
 * DamageDealtEvent: Emitted when damage is applied to an entity.
 */
export const DamageDealtEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('DamageDealt'),
    data: z.object({
        amount: z.number().describe("Damage points dealt"),
        newHp: z.number().describe("Remaining HP after damage")
    })
}).describe("Damage dealt event");
export type DamageDealtEvent = z.infer<typeof DamageDealtEventSchema>;

/**
 * ImpactEvent: Emitted when a munition impacts an entity.
 */
export const ImpactEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('Impact'),
    data: z.object({
        damage: z.number().describe("Damage points dealt"),
        remainingHp: z.number().describe("Remaining HP after damage")
    })
}).describe("Munition impact event");
export type ImpactEvent = z.infer<typeof ImpactEventSchema>;

/**
 * DetonationEvent: Emitted when a warhead detonates (area effect).
 */
export const DetonationEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('Detonation'),
    data: z.object({
        position: Vector3Schema,
        radius: z.number().describe("Blast radius in meters"),
        damage: z.number().describe("Peak damage at epicenter")
    })
}).describe("Warhead detonation event");
export type DetonationEvent = z.infer<typeof DetonationEventSchema>;

/**
 * SubsystemDamageEvent: Emitted when a specific subsystem is damaged.
 */
export const SubsystemDamageEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('SubsystemDamage'),
    data: z.object({
        subsystemId: z.string().describe("ID of the damaged subsystem"),
        damage: z.number().describe("Damage points dealt"),
        remainingHp: z.number().describe("Remaining HP of the subsystem")
    })
}).describe("Subsystem damage event");
export type SubsystemDamageEvent = z.infer<typeof SubsystemDamageEventSchema>;

/**
 * TelemetryUpdatedEvent: Emitted when an entity's kinematics are manually overridden.
 */
export const TelemetryUpdatedEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('TelemetryUpdated'),
    data: z.object({
        position: Vector3Schema.optional(),
        heading: z.number().optional(),
        speedKts: z.number().optional(),
        altitudeM: z.number().optional()
    })
}).describe("Manual telemetry override event");
export type TelemetryUpdatedEvent = z.infer<typeof TelemetryUpdatedEventSchema>;

/**
 * SimulationSpeedChangedEvent: Emitted when time compression changes.
 */
export const SimulationSpeedChangedEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('SimulationSpeedChanged'),
    data: z.object({
        timeCompression: z.number().describe("New time compression factor"),
        isPaused: z.boolean().describe("Whether the simulation is now paused")
    })
}).describe("Simulation speed change event");
export type SimulationSpeedChangedEvent = z.infer<typeof SimulationSpeedChangedEventSchema>;

/**
 * DetectionEvent: Emitted when a sensor gains or loses a detection.
 */
export const DetectionEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('Detection'),
    data: z.object({
        sensorType: z.string().describe("Type of sensor that detected"),
        rangeM: z.number().describe("Range to target at detection"),
        bearing: z.number().describe("Bearing to target in degrees")
    })
}).describe("Sensor detection event");
export type DetectionEvent = z.infer<typeof DetectionEventSchema>;

/**
 * EntitySideChangedEvent: Emitted when an entity's side is changed.
 */
export const EntitySideChangedEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('EntitySideChanged'),
    data: z.object({
        oldSide: SideSchema,
        newSide: SideSchema
    })
}).describe("Entity side change event");
export type EntitySideChangedEvent = z.infer<typeof EntitySideChangedEventSchema>;

/**
 * ViewStateUpdatedEvent: Emitted periodically to synchronize UI state.
 */
export const ViewStateUpdatedEventSchema = z.object({
    tick: z.number(),
    type: z.literal('ViewStateUpdated'),
    data: ViewStatePayloadSchema
}).describe("UI state synchronization event");
export type ViewStateUpdatedEvent = z.infer<typeof ViewStateUpdatedEventSchema>;

/**
 * MissionStatusChangedEvent: Emitted when a mission transitions state.
 */
export const MissionStatusChangedEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('MissionStatusChanged'),
    data: z.object({
        missionType: z.string().describe("Type of mission"),
        oldStatus: z.string().describe("Previous mission status"),
        newStatus: z.string().describe("New mission status")
    })
}).describe("Mission status change event");
export type MissionStatusChangedEvent = z.infer<typeof MissionStatusChangedEventSchema>;

/**
 * GenericEventData: Typed payload for events not covered by specific schemas.
 * Accepts deeply nested structures to support ViewStatePayload and similar complex payloads.
 */
const GenericEventValueSchema: z.ZodTypeAny = z.lazy(() => z.union([
    z.string(), z.number(), z.boolean(), z.null(),
    z.record(GenericEventValueSchema),
    z.array(GenericEventValueSchema)
]));

export const GenericEventDataSchema = z.record(GenericEventValueSchema)
    .describe("Generic event data record");

/**
 * GenericEvent: Catch-all for events not covered by specific schemas.
 */
export const GenericEventSchema = BaseEventPayloadSchema.extend({
    type: z.string(),
    data: GenericEventDataSchema.optional()
}).describe("Generic simulation event");

/**
 * SimulationEvent: Union of all possible simulation events.
 */
export const SimulationEventSchema = z.union([
    EntitySpawnedEventSchema,
    EntityDestroyedEventSchema,
    WeaponFiredEventSchema,
    DamageDealtEventSchema,
    SimulationSpeedChangedEventSchema,
    DetectionEventSchema,
    MissionStatusChangedEventSchema,
    ViewStateUpdatedEventSchema,
    ImpactEventSchema,
    DetonationEventSchema,
    SubsystemDamageEventSchema,
    TelemetryUpdatedEventSchema,
    GenericEventSchema
]).describe("Any simulation event");
export type SimulationEvent = z.infer<typeof SimulationEventSchema>;
export type TacticalEvent = SimulationEvent;

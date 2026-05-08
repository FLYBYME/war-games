import { z } from 'zod';
import { EntityIdSchema, Vector3Schema, SideSchema } from './domain.js';

// Base event payload structure
export const BaseEventPayloadSchema = z.object({
    tick: z.number(),
    entityId: EntityIdSchema.optional(),
    targetId: EntityIdSchema.optional(),
});

// Specific Event Payloads
export const EntitySpawnedEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('EntitySpawned'),
    data: z.object({
        side: SideSchema,
        position: Vector3Schema,
        profileId: z.string()
    })
});
export type EntitySpawnedEvent = z.infer<typeof EntitySpawnedEventSchema>;

export const EntityDestroyedEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('EntityDestroyed'),
    data: z.object({
        reason: z.string().optional()
    })
});
export type EntityDestroyedEvent = z.infer<typeof EntityDestroyedEventSchema>;

export const WeaponFiredEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('WeaponFired'),
    data: z.object({
        weaponProfileId: z.string(),
        mountIndex: z.number()
    })
});
export type WeaponFiredEvent = z.infer<typeof WeaponFiredEventSchema>;

export const DamageDealtEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('DamageDealt'),
    data: z.object({
        amount: z.number(),
        newHp: z.number()
    })
});
export type DamageDealtEvent = z.infer<typeof DamageDealtEventSchema>;
export const SimulationSpeedChangedEventSchema = BaseEventPayloadSchema.extend({
    type: z.literal('SimulationSpeedChanged'),
    data: z.object({
        timeCompression: z.number(),
        isPaused: z.boolean()
    })
});
export type SimulationSpeedChangedEvent = z.infer<typeof SimulationSpeedChangedEventSchema>;

// The unified EngineEvent schema
export const SimulationEventSchema = z.union([
    EntitySpawnedEventSchema,
    EntityDestroyedEventSchema,
    WeaponFiredEventSchema,
    DamageDealtEventSchema,
    SimulationSpeedChangedEventSchema,
    // Fallback for generic events
    BaseEventPayloadSchema.extend({
        type: z.string(),
        data: z.record(z.unknown()).optional()
    })
]);
export type SimulationEvent = z.infer<typeof SimulationEventSchema>;
export type TacticalEvent = SimulationEvent;

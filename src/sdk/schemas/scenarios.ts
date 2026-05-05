import { z } from 'zod';
import { Vector3Schema, SideSchema } from './domain.js';
import { EngineCommandPayloadSchema, ScenarioIntentSchema } from './protocol.js';

export const ScenarioTriggerSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('tick'), tick: z.number() }),
    z.object({ type: z.literal('tactical_event'), eventType: z.string(), filters: z.record(z.any()).optional() }),
    z.object({ type: z.literal('proximity'), entityId: z.string(), targetId: z.string(), radiusM: z.number() }),
    z.object({ type: z.literal('area'), entityId: z.string(), zone: z.object({ x: z.number(), y: z.number(), radius: z.number() }) }),
    z.object({ type: z.literal('condition'), entityId: z.string(), property: z.string(), operator: z.enum(['<', '>', '==']), value: z.number() })
]);

export const ScenarioEventSchema = z.object({
    tick: z.number().optional(), // Backward compatibility
    trigger: ScenarioTriggerSchema.optional(),
    command: EngineCommandPayloadSchema
});

export const ScenarioAssertionSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('exists'), tick: z.number().optional(), trigger: ScenarioTriggerSchema.optional(), params: z.object({ entityId: z.string() }) }),
    z.object({ type: z.literal('dead'), tick: z.number().optional(), trigger: ScenarioTriggerSchema.optional(), params: z.object({ entityId: z.string() }) }),
    z.object({ type: z.literal('speed_at_least'), tick: z.number().optional(), trigger: ScenarioTriggerSchema.optional(), params: z.object({ entityId: z.string(), speedKts: z.number() }) }),
    z.object({ type: z.literal('pos_within'), tick: z.number().optional(), trigger: ScenarioTriggerSchema.optional(), params: z.object({ entityId: z.string(), position: Vector3Schema, radiusM: z.number() }) }),
    z.object({ type: z.literal('event_occurred'), event: z.string(), byTick: z.number().optional(), params: z.record(z.any()).optional() })
]);

import { EntityProfileSchema } from './profiles.js';

export const ScenarioEntitySchema = z.object({
    id: z.string().optional(),
    profileId: z.string().optional(),
    profile: EntityProfileSchema.optional(),
    side: SideSchema,
    pos: z.union([Vector3Schema, z.tuple([z.number(), z.number(), z.number()])]).optional(),
    position: Vector3Schema.optional(),
    heading: z.number().optional(),
    speedKts: z.number().optional()
}).refine(data => data.profileId || data.profile, {
    message: "Either profileId or profile must be provided",
    path: ["profileId"]
});
export type ScenarioEntity = z.infer<typeof ScenarioEntitySchema>;

import { WeaponProfileSchema } from './profiles.js';

export const ScenarioManifestSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    origin: z.object({ lat: z.number(), lon: z.number() }).optional(),
    entities: z.array(ScenarioEntitySchema),
    events: z.array(ScenarioEventSchema).optional(),
    assertions: z.array(ScenarioAssertionSchema).optional(),
    intents: z.array(ScenarioIntentSchema).optional(),
    platformProfiles: z.record(EntityProfileSchema).optional(),
    weaponProfiles: z.array(WeaponProfileSchema).optional()
});

export type ScenarioManifest = z.infer<typeof ScenarioManifestSchema>;
export type ScenarioEvent = z.infer<typeof ScenarioEventSchema>;
export type ScenarioAssertion = z.infer<typeof ScenarioAssertionSchema>;
export type ScenarioIntent = z.infer<typeof ScenarioIntentSchema>;

export const WorldStateSchema = z.object({
    currentTick: z.number(),
    entities: z.array(z.object({
        id: z.string(),
        side: SideSchema,
        parentId: z.string().optional(),
        components: z.array(z.object({
            type: z.string(),
            data: z.any()
        }))
    }))
});

export type WorldState = z.infer<typeof WorldStateSchema>;

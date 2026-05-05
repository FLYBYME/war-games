import { z } from 'zod';
import { EntityIdSchema, Vector3Schema, LlaSchema, SideSchema } from './domain.js';

// ─── Scenario Intents ─────────────────────────────────────────

export const ScenarioIntentSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('Mission'),
        actorId: z.string().describe('Entity or Group ID'),
        missionType: z.enum(['Patrol', 'Strike', 'ASW', 'Escort', 'Idle', 'VBSS', 'Minelaying', 'MCM']),
        params: z.record(z.any())
    }),
    z.object({
        type: z.literal('Doctrine'),
        actorId: z.string().optional().describe('Optional Entity/Group ID. If null, applies to side.'),
        side: SideSchema.optional(),
        roe: z.enum(['Free', 'Tight', 'Hold']).optional(),
        emcon: z.enum(['Alpha', 'Bravo', 'Charlie']).optional(),
        wra: z.array(z.object({
            targetType: z.string(),
            weaponType: z.string(),
            quantity: z.number(),
            maxRangePct: z.number().optional(),
            minRangeM: z.number().optional()
        })).optional()
    }),
    z.object({
        type: z.literal('Group'),
        groupId: z.string(),
        leaderId: z.string(),
        members: z.array(z.string()),
        formationType: z.string().optional()
    }),
    z.object({
        type: z.literal('Logistics'),
        baseId: z.string(),
        hostedEntities: z.array(z.string()),
        initialState: z.string().optional().default('Ready')
    })
]);

// ─── ViewState Models ─────────────────────────────────────────

export const ViewUnitPayloadSchema = z.object({
    id: EntityIdSchema,
    side: z.string(),
    parentId: EntityIdSchema.optional(),
    pos: Vector3Schema,
    vel: Vector3Schema.optional(),
    lla: LlaSchema.optional(),
    rot: z.number(),
    hp: z.number(),
    isDestroyed: z.boolean(),
    logState: z.string(),
    fuelPct: z.number(),
    isBingo: z.boolean(),
    sensors: z.array(z.object({
        name: z.string(),
        rangeM: z.number(),
        azimuthDeg: z.number(),
        halfArcDeg: z.number(),
        active: z.boolean()
    })),
    mounts: z.array(z.object({
        id: z.string(),
        type: z.string(),
        roundsRemaining: z.number()
    })),
    losPolygon: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
    desiredSpeedKts: z.number().optional(),
    desiredAltitudeM: z.number().optional(),
    profileId: z.string().optional(),
    sensorMask: z.number().optional(),
    speedKts: z.number().optional(),
    waypoints: z.array(z.object({ id: z.string(), pos: Vector3Schema, speedKts: z.number().optional() })).optional(),
    datalink: z.object({ nodes: z.array(z.string()), edges: z.array(z.any()) }).optional(),
    coveragePolygons: z.object({ radar: z.array(z.any()), wez: z.array(z.any()) }).optional(),
    doctrine: z.object({ roe: z.string(), emcon: z.string(), wraRules: z.array(z.any()) }).optional(),
    mission: z.object({ type: z.string(), status: z.string(), params: z.any() }).optional()
});
export type ViewUnitPayload = z.infer<typeof ViewUnitPayloadSchema>;

export const ViewTrackPayloadSchema = z.object({
    id: z.string(),
    pos: Vector3Schema,
    lla: LlaSchema.optional(),
    vel: Vector3Schema,
    classification: z.string(),
    identification: z.string().optional(),
    lastSeen: z.number(),
    cep: z.number(),
    rot: z.number().optional(),
    speedKts: z.number().optional()
});
export type ViewTrackPayload = z.infer<typeof ViewTrackPayloadSchema>;

export const ViewStatePayloadSchema = z.object({
    tick: z.number(),
    timestamp: z.number(),
    sequence: z.number(),
    isPaused: z.boolean(),
    side: z.string(),
    origin: z.object({ lat: z.number(), lon: z.number() }),
    units: z.array(ViewUnitPayloadSchema),
    tracks: z.array(ViewTrackPayloadSchema), // UI tracks are stripped down
    losses: z.object({ blue: z.number(), red: z.number(), munitionsExpended: z.number() }),
    weather: z.object({
        precipitation: z.number().optional(), // In ui/shared/types it's precipitation, in core it's precipitationRateMMhr. Let's support both for transition.
        precipitationRateMMhr: z.number().optional(),
        cloudCover: z.number(),
        seaState: z.number(),
        windSpeedKts: z.number(),
        windDirDeg: z.number(),
        visibilityNM: z.number(),
        temperatureC: z.number()
    }),
    datalinkGraph: z.object({
        nodes: z.array(z.string()),
        edges: z.array(z.object({ a: z.string(), b: z.string(), latencyMs: z.number() }))
    }),
    weaponBindings: z.array(z.object({
        weaponId: z.string(),
        targetId: z.string(),
        shooterId: z.string()
    })),
    esmBearings: z.array(z.object({
        observerId: z.string(),
        bearingDeg: z.number(),
        confidencePct: z.number(),
        targetId: z.string().optional()
    })),
    mapData: z.any().optional()
});
export type ViewStatePayload = z.infer<typeof ViewStatePayloadSchema>;
export type ViewStateSnapshot = ViewStatePayload; // Alias for engine compatibility

// ─── Engine Command Payloads ─────────────────────────────────

export const EngineCommandPayloadSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('SetCourse'), entityId: EntityIdSchema, position: Vector3Schema, speedKts: z.number() }),
    z.object({ type: z.literal('AddWaypoint'), entityId: EntityIdSchema, position: Vector3Schema, speedKts: z.number() }),
    z.object({ type: z.literal('ClearWaypoints'), entityId: EntityIdSchema }),
    z.object({ type: z.literal('FireWeapon'), entityId: EntityIdSchema, mountIndex: z.number(), targetId: EntityIdSchema }),
    z.object({ type: z.literal('SetHeading'), entityId: EntityIdSchema, heading: z.number() }),
    z.object({ type: z.literal('SetSpeed'), entityId: EntityIdSchema, speedKts: z.number() }),
    z.object({ type: z.literal('SetAltitude'), entityId: EntityIdSchema, altitudeM: z.number() }),
    z.object({ type: z.literal('SetEMCON'), entityId: EntityIdSchema.optional(), state: z.string() }),
    z.object({ type: z.literal('SetSensorState'), entityId: EntityIdSchema, sensor: z.string(), active: z.boolean() }),
    z.object({ type: z.literal('SetUnitROE'), entityId: EntityIdSchema, roe: z.string() }),
    z.object({ type: z.literal('SetGlobalROE'), roe: z.string() }),
    z.object({ type: z.literal('SetMissionROE'), roe: z.string() }), // Wait, in ui/shared/types it doesn't have entityId, but engine SetMissionROECommand has entityId? Let's check command handler later. Adding entityId as optional.
    z.object({ type: z.literal('SetMission'), entityId: EntityIdSchema, missionType: z.string(), params: z.any() }),
    z.object({ type: z.literal('AssignWeapon'), entityId: EntityIdSchema, mount: z.string(), targetId: EntityIdSchema }),
    z.object({ type: z.literal('JoinFormation'), entityId: EntityIdSchema, leaderId: EntityIdSchema, offset: Vector3Schema }),
    z.object({ type: z.literal('BreakFormation'), entityId: EntityIdSchema }),
    z.object({ type: z.literal('SetLoadout'), entityId: EntityIdSchema.optional(), loadout: z.string() }), // Needs entityId
    z.object({ type: z.literal('SetEnvironment'), key: z.string(), value: z.number() }),
    z.object({ type: z.literal('LandAtFacility'), entityId: EntityIdSchema, facilityId: EntityIdSchema }),
    z.object({ type: z.literal('TransferResources'), fromId: EntityIdSchema, toId: EntityIdSchema, fuelKg: z.number() }),
    z.object({ type: z.literal('ApplyDamage'), entityId: EntityIdSchema, damage: z.number() }),
    z.object({ type: z.literal('DestroyEntity'), entityId: EntityIdSchema }),
    z.object({ type: z.literal('SpawnEntity'), id: z.string(), profileId: z.string(), side: SideSchema, position: Vector3Schema, heading: z.number(), speedKts: z.number().optional() }),
    z.object({ type: z.literal('SetIntent'), intent: ScenarioIntentSchema }),
    z.object({ type: z.literal('UpdateWRARules'), entityId: EntityIdSchema, rules: z.array(z.any()) }),
    z.object({ type: z.literal('LaunchAircraft'), entityId: EntityIdSchema })
]);
export type EngineCommandPayload = z.infer<typeof EngineCommandPayloadSchema>;

// ─── Network Message Envelopes ───────────────────────────────

export const EngineEventSchema = z.object({
    tick: z.number(),
    type: z.string(),
    entityId: EntityIdSchema.optional(),
    targetId: EntityIdSchema.optional(),
    data: z.record(z.any()).optional()
});
export type EngineEvent = z.infer<typeof EngineEventSchema>;

export const PlatformProfileSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    domain: z.string(),
    country: z.string()
});
export type PlatformProfileSummary = z.infer<typeof PlatformProfileSummarySchema>;

export const ServerMessageSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('VIEW_STATE'), payload: ViewStatePayloadSchema }),
    z.object({ type: z.literal('COMMAND_ACK'), payload: z.object({ commandType: z.string(), success: z.boolean(), error: z.string().optional() }) }),
    z.object({ type: z.literal('EVENT'), payload: EngineEventSchema }),
    z.object({ type: z.literal('PROFILE_LIST'), payload: z.array(PlatformProfileSummarySchema) }),
    z.object({ type: z.literal('ERROR'), payload: z.object({ message: z.string() }) }),
    z.object({ type: z.literal('SCENARIO_EXPORTED'), payload: z.any() }),
    z.object({ type: z.literal('SCENARIO_IMPORTED'), payload: z.object({ success: z.boolean() }) })
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

export const ClientMessageSchema = z.discriminatedUnion('type', [
    z.object({ 
        type: z.literal('JOIN_MATCH'), 
        matchId: z.string(), 
        side: z.string(),
        syncRateHz: z.number().optional(),
        fullSyncIntervalMs: z.number().optional()
    }),
    z.object({ type: z.literal('ISSUE_COMMAND'), matchId: z.string(), command: EngineCommandPayloadSchema }),
    z.object({ type: z.literal('SET_TIME_COMPRESSION'), matchId: z.string(), rate: z.number() }),
    z.object({ type: z.literal('GET_TELEMETRY'), matchId: z.string() }),
    z.object({ type: z.literal('GET_PROFILES'), matchId: z.string(), category: z.string().optional() }),
    z.object({ type: z.literal('EXPORT_SCENARIO'), matchId: z.string() }),
    z.object({ type: z.literal('IMPORT_SCENARIO'), matchId: z.string(), payload: z.any() })
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

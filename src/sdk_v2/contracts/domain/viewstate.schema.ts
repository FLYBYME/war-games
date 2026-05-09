import { z } from 'zod';
import { Vector3Schema, LlaSchema, SideSchema, EntityIdSchema, GeoJSONSchema } from './primitives.schema.js';
import { WRARuleSchema, MissionSchema } from './tactical.schema.js';
import { ESMBearingSchema } from './tactical.schema.js';

// ─── ViewState Protocol Models ───────────────────────────────────────────────
// These schemas define the shape of data sent from the server to the UI client
// via WebSocket. They are UI-specific projections of the engine's internal state.

/**
 * ViewUnitPayload: A single unit visible to a specific side.
 */
export const ViewUnitPayloadSchema = z.object({
    id: EntityIdSchema,
    side: SideSchema,
    category: z.enum(['Aircraft', 'Helicopter', 'Ship', 'Submarine', 'Facility', 'Weapon', 'Mine']).optional().describe("The platform category"),
    parentId: EntityIdSchema.optional(),
    pos: Vector3Schema,
    vel: Vector3Schema.optional(),
    lla: LlaSchema.optional(),
    heading: z.number().describe("Heading in degrees [0-360]"),
    hp: z.number().describe("Current hitpoints"),
    isDestroyed: z.boolean(),
    logState: z.string().describe("Logistics state, e.g. 'Ready', 'Taxiing', 'Refueling'"),
    fuelPct: z.number().min(0).max(1).describe("0.0 to 1.0. A value of 0 on a missile means motor burnout, NOT that it needs a refueling tanker"),
    isBingo: z.boolean().describe("True if unit has reached critical fuel state"),
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
    speedKts: z.number().optional().describe("Current kinematic speed in knots"),
    waypoints: z.array(z.object({ id: z.string(), pos: Vector3Schema, speedKts: z.number().optional() })).optional(),
    datalink: z.object({
        networkId: z.string().optional(),
        isActive: z.boolean().optional(),
        latency: z.number().optional(),
        nodes: z.array(z.string()).optional(),
        edges: z.array(z.object({ a: z.string(), b: z.string(), latencyMs: z.number() })).optional()
    }).optional(),
    coveragePolygons: z.object({
        radar: z.array(z.object({ lat: z.number(), lon: z.number() })).optional(),
        wez: z.array(z.object({ lat: z.number(), lon: z.number() })).optional()
    }).optional(),
    doctrine: z.object({
        roe: z.string(),
        emcon: z.string(),
        wraRules: z.array(WRARuleSchema)
    }).optional(),
    mission: MissionSchema.optional(),
    activeTasks: z.array(z.object({
        id: z.string(),
        type: z.string(),
        status: z.string()
    })).optional()
}).describe("A single unit visible to a specific side");
export type ViewUnitPayload = z.infer<typeof ViewUnitPayloadSchema>;

/**
 * ViewTrackPayload: A fused sensor track visible to a side.
 */
export const ViewTrackPayloadSchema = z.object({
    id: z.string(),
    pos: Vector3Schema,
    lla: LlaSchema.optional(),
    vel: Vector3Schema,
    classification: z.string(),
    identification: z.string().optional(),
    firstSeen: z.number().describe("Server tick when this track was first detected"),
    lastSeen: z.number().describe("Server tick when this track was last updated"),
    cep: z.number().describe("Circular Error Probable radius in meters"),
    heading: z.number().optional().describe("Heading in degrees [0-360]"),
    speedKts: z.number().optional().describe("Kinematic speed derived from velocity in knots")
}).describe("A fused sensor track visible to a side");
export type ViewTrackPayload = z.infer<typeof ViewTrackPayloadSchema>;

/**
 * ViewStatePayload: The complete UI state snapshot for a side.
 */
export const ViewStatePayloadSchema = z.object({
    tick: z.number(),
    timestamp: z.number(),
    sequence: z.number(),
    isPaused: z.boolean(),
    side: SideSchema,
    origin: z.object({ lat: z.number(), lon: z.number() }),
    units: z.array(ViewUnitPayloadSchema),
    tracks: z.array(ViewTrackPayloadSchema),
    losses: z.object({ blue: z.number(), red: z.number(), munitionsExpended: z.number() }),
    weather: z.object({
        precipitation: z.number().optional(),
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
    threatMap: z.array(z.object({ lat: z.number(), lon: z.number(), level: z.number() })).optional(),
    weaponBindings: z.array(z.object({
        weaponId: z.string(),
        targetId: z.string(),
        shooterId: z.string()
    })),
    esmBearings: z.array(ESMBearingSchema),
    mapData: z.object({
        bathymetry: GeoJSONSchema.optional(),
        borders: GeoJSONSchema.optional()
    }).optional()
}).describe("Complete UI state snapshot for a side");
export type ViewStatePayload = z.infer<typeof ViewStatePayloadSchema>;
export type ViewStateSnapshot = ViewStatePayload;

/**
 * MatchInfo: Server-level match metadata (not ECS state).
 */
export const MatchInfoSchema = z.object({
    id: z.string().describe("Match ID"),
    scenarioId: z.string().describe("Scenario template ID"),
    name: z.string().describe("Match name"),
    tick: z.number().describe("Current tick"),
    isPaused: z.boolean().describe("Whether paused"),
    timeCompression: z.number().describe("Time compression factor")
}).describe("Match metadata");
export type MatchInfo = z.infer<typeof MatchInfoSchema>;

import { z } from 'zod';

export const EntityIdSchema = z.string();
export type EntityId = z.infer<typeof EntityIdSchema>;

export enum Side {
    Neutral = 'Neutral',
    Blue = 'Blue',
    Red = 'Red',
    Green = 'Green'
}
export const SideSchema = z.nativeEnum(Side);

export const Vector3Schema = z.object({
    x: z.number().describe("WGS84 Easting / Longitude offset in meters from origin"),
    y: z.number().describe("WGS84 Northing / Latitude offset in meters from origin"),
    z: z.number().describe("Altitude in meters. Positive is up.")
});
export type Vector3 = z.infer<typeof Vector3Schema>;

export const LlaSchema = z.object({
    lat: z.number().describe("Latitude in decimal degrees"),
    lon: z.number().describe("Longitude in decimal degrees"),
    alt: z.number().describe("Altitude in meters above sea level")
});
export type Lla = z.infer<typeof LlaSchema>;

export enum MissionType {
    Patrol = 'Patrol',
    Strike = 'Strike',
    ASW = 'ASW',
    Escort = 'Escort',
    Idle = 'Idle',
    VBSS = 'VBSS',
    Minelaying = 'Minelaying',
    MCM = 'MCM',
    Intercept = 'Intercept'
}
export const MissionTypeSchema = z.nativeEnum(MissionType);

export const AreaV3Schema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    points: z.array(Vector3Schema)
});
export type AreaV3 = z.infer<typeof AreaV3Schema>;

export const AreaLlaSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    points: z.array(LlaSchema)
});
export type AreaLla = z.infer<typeof AreaLlaSchema>;

export const AreaSchema = z.union([AreaV3Schema, AreaLlaSchema]);
export type Area = AreaV3 | AreaLla;

export const MissionParamsSchema = z.object({
    center: Vector3Schema.optional().describe("Center of patrol or mission area"),
    radiusM: z.number().optional().describe("Radius of mission area in meters"),
    targetId: EntityIdSchema.optional().describe("Primary target for Strike/Escort/Intercept missions"),
    searchPattern: z.string().optional().describe("Pattern type for searches"),
    area: AreaSchema.optional().describe("Geographic constraint area"),
    allowedArea: AreaSchema.optional().describe("VBSS/Boarding allowed area"),
}).catchall(z.unknown());
export type MissionParams = z.infer<typeof MissionParamsSchema>;

export enum MissionStatus {
    Pending = 'Pending',
    Active = 'Active',
    Completed = 'Completed',
    Aborted = 'Aborted',
    Failed = 'Failed',
    Suspended = 'Suspended'
}
export const MissionStatusSchema = z.nativeEnum(MissionStatus);

export const MissionSchema = z.object({
    type: MissionTypeSchema.describe("The tactical objective type"),
    status: MissionStatusSchema.describe("Execution status"),
    params: MissionParamsSchema.optional()
});
export type Mission = z.infer<typeof MissionSchema>;

export enum EntityCategory {
    Unknown = 0,
    Platform = 1,
    Weapon = 2,
    Sensor = 3,
    Facility = 4
}
export const EntityCategorySchema = z.nativeEnum(EntityCategory);

export enum TrackStatus {
    Active = 'Active',
    Coasting = 'Coasting',
    Dropped = 'Dropped'
}
export const TrackStatusSchema = z.nativeEnum(TrackStatus);

export enum IdentificationStatus {
    UNKNOWN = 'Unknown',
    PENDING = 'Pending',
    ASSUMED_FRIENDLY = 'AssumedFriendly',
    FRIENDLY = 'Friendly',
    NEUTRAL = 'Neutral',
    SUSPECT = 'Suspect',
    HOSTILE = 'Hostile'
}
export const IdentificationStatusSchema = z.nativeEnum(IdentificationStatus);

export const TrackSchema = z.object({
    id: z.string(),
    trueEntityId: z.string().describe("Hidden ground truth entity ID"),
    position: Vector3Schema,
    velocity: Vector3Schema,
    lastSeenTick: z.number(),
    cepM: z.number().describe("Circular Error Probable in meters"),
    status: TrackStatusSchema,
    classification: z.string().describe("e.g. 'Air-Commercial', 'Surface-Combatant'"),
    identification: IdentificationStatusSchema,
    confidence: z.number().min(0).max(1).describe("Confidence in classification/ID")
});
export type Track = z.infer<typeof TrackSchema>;

export interface IComponent {
    readonly type: string;
}

export type ComponentConstructor<T extends IComponent> = new (...args: unknown[]) => T;

export enum SensorType {
    Radar = 'Radar',
    Sonar = 'Sonar',
    Visual = 'Visual',
    ESM = 'ESM',
    IRST = 'IRST'
}
export const SensorTypeSchema = z.nativeEnum(SensorType);

export enum EMBand {
    L = 'L',   // 1-2 GHz
    S = 'S',   // 2-4 GHz
    C = 'C',   // 4-8 GHz
    X = 'X',   // 8-12 GHz
    Ku = 'Ku', // 12-18 GHz
}
export const EMBandSchema = z.nativeEnum(EMBand);

export enum SensorMode {
    Search = 'Search',
    Track = 'Track',
    Illumination = 'Illumination' // CW for SARH
}
export const SensorModeSchema = z.nativeEnum(SensorMode);

export enum MountingType {
    Fixed = 'Fixed',
    Turret = 'Turret',
    Hull = 'Hull',
    TowedArray = 'TowedArray',
    Sonobuoy = 'Sonobuoy',
    Dipping = 'Dipping'
}
export const MountingTypeSchema = z.nativeEnum(MountingType);

export enum EMCONState {
    Alpha = 'Alpha',   // Fully Active
    Bravo = 'Bravo',   // Restricted
    Charlie = 'Charlie', // Silent
    Silent = 'Silent'
}
export const EMCONStateSchema = z.nativeEnum(EMCONState);

export enum ROE {
    FREE = 'Free',
    TIGHT = 'Tight',
    HOLD = 'Hold'
}
export const ROESchema = z.nativeEnum(ROE);

export const WRARuleSchema = z.object({
    targetType: z.string(),
    weaponType: z.string(),
    quantity: z.number(),
    maxRangePct: z.number().optional(),
    minRangeM: z.number().optional()
});
export type WRARule = z.infer<typeof WRARuleSchema>;

// --- GeoJSON Types ---

export const GeoJSONGeometrySchema = z.object({
    type: z.string(),
    coordinates: z.unknown()
});

export const GeoJSONFeatureSchema = z.object({
    type: z.literal('Feature'),
    geometry: GeoJSONGeometrySchema,
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export const GeoJSONSchema = z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(GeoJSONFeatureSchema)
});

export type GeoJSON = z.infer<typeof GeoJSONSchema>;
export type GeoJSONFeature = z.infer<typeof GeoJSONFeatureSchema>;
export type GeoJSONGeometry = z.infer<typeof GeoJSONGeometrySchema>;

// --- Terrain Types ---

export const MapRegionSchema = z.object({
    id: z.string(),
    name: z.string(),
    bounds: z.object({
        minLat: z.number(),
        maxLat: z.number(),
        minLon: z.number(),
        maxLon: z.number()
    }),
    metadata: z.record(z.unknown()).optional().describe("Additional region metadata")
});
export type MapRegion = z.infer<typeof MapRegionSchema>;

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
    x: z.number(),
    y: z.number(),
    z: z.number()
});
export type Vector3 = z.infer<typeof Vector3Schema>;

export const LlaSchema = z.object({
    lat: z.number(),
    lon: z.number(),
    alt: z.number()
});
export type Lla = z.infer<typeof LlaSchema>;

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
    trueEntityId: z.string(),
    position: Vector3Schema,
    velocity: Vector3Schema,
    lastSeenTick: z.number(),
    cepM: z.number(),
    status: TrackStatusSchema,
    classification: z.string(),
    identification: IdentificationStatusSchema,
    confidence: z.number()
});
export type Track = z.infer<typeof TrackSchema>;

export interface IComponent {
    readonly type: string;
}

export type ComponentConstructor<T extends IComponent> = new (...args: any[]) => T;

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

// --- GeoJSON Types ---

export const GeoJSONGeometrySchema = z.object({
    type: z.string(),
    coordinates: z.any()
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
    metadata: z.object({
        land: z.object({ minElevation: z.number(), maxElevation: z.number() }).optional(),
        ocean: z.object({ minElevation: z.number(), maxElevation: z.number() }).optional()
    }).catchall(z.any())
});
export type MapRegion = z.infer<typeof MapRegionSchema>;

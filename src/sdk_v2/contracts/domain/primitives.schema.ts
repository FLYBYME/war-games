import { z } from 'zod';

// ─── Atomic Identifiers ──────────────────────────────────────────────────────

/**
 * EntityId: A string identifier for all entities in the simulation.
 */
export const EntityIdSchema = z.string().describe("Unique entity identifier");
export type EntityId = z.infer<typeof EntityIdSchema>;

// ─── Coordinate Systems ──────────────────────────────────────────────────────

/**
 * Vector3: A 3D coordinate in the simulation's local meter-space.
 * Origin is set per-match from the scenario's WGS84 origin.
 */
export const Vector3Schema = z.object({
    x: z.number().describe("Easting offset in meters from match origin"),
    y: z.number().describe("Northing offset in meters from match origin"),
    z: z.number().describe("Altitude in meters. Positive is up, negative is depth.")
}).describe("3D coordinate in the simulation's local meter-space");
export type Vector3 = z.infer<typeof Vector3Schema>;

/**
 * Lla: A geodetic coordinate in WGS84 (Latitude, Longitude, Altitude).
 */
export const LlaSchema = z.object({
    lat: z.number().describe("Latitude in decimal degrees"),
    lon: z.number().describe("Longitude in decimal degrees"),
    alt: z.number().describe("Altitude in meters above mean sea level")
}).describe("WGS84 geodetic coordinate");
export type Lla = z.infer<typeof LlaSchema>;

// ─── Enumerations ────────────────────────────────────────────────────────────

/**
 * Side: The tactical faction/alliance of an entity.
 */
export enum Side {
    Neutral = 'Neutral',
    Blue = 'Blue',
    Red = 'Red',
    Green = 'Green'
}
export const SideSchema = z.nativeEnum(Side).describe("The tactical side/alliance of the entity (Blue, Red, Neutral, Green)");

/**
 * EntityCategory: The broad functional classification of an entity.
 */
export enum EntityCategory {
    Unknown = 0,
    Platform = 1,
    Weapon = 2,
    Sensor = 3,
    Facility = 4
}
export const EntityCategorySchema = z.nativeEnum(EntityCategory).describe("Broad functional classification of an entity");

// ─── Geographic Areas ────────────────────────────────────────────────────────

/**
 * AreaV3: A polygonal region defined by Vector3 vertices.
 */
export const AreaV3Schema = z.object({
    id: z.string().optional().describe("Unique area identifier"),
    name: z.string().optional().describe("Human-readable area name"),
    points: z.array(Vector3Schema).describe("Ordered polygon vertices in meter-space")
}).describe("Polygonal area defined in meter-space");
export type AreaV3 = z.infer<typeof AreaV3Schema>;

/**
 * AreaLla: A polygonal region defined by WGS84 vertices.
 */
export const AreaLlaSchema = z.object({
    id: z.string().optional().describe("Unique area identifier"),
    name: z.string().optional().describe("Human-readable area name"),
    points: z.array(LlaSchema).describe("Ordered polygon vertices in WGS84")
}).describe("Polygonal area defined in WGS84 coordinates");
export type AreaLla = z.infer<typeof AreaLlaSchema>;

/**
 * Area: Either a meter-space or WGS84 polygonal region.
 */
export const AreaSchema = z.union([AreaV3Schema, AreaLlaSchema]).describe("Polygonal area in meter-space or WGS84");
export type Area = AreaV3 | AreaLla;

// ─── GeoJSON ─────────────────────────────────────────────────────────────────

/** GeoJSON coordinate arrays: typed recursive structure for safety */
export const GeoJSONCoordinateSchema = z.union([
    z.tuple([z.number(), z.number()]),
    z.tuple([z.number(), z.number(), z.number()])
]).describe("A GeoJSON coordinate pair [lon, lat] or [lon, lat, alt]");
export type GeoJSONCoordinate = z.infer<typeof GeoJSONCoordinateSchema>;

export const GeoJSONGeometrySchema = z.object({
    type: z.enum(['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon']).describe("GeoJSON geometry type"),
    coordinates: z.union([
        GeoJSONCoordinateSchema,
        z.array(GeoJSONCoordinateSchema),
        z.array(z.array(GeoJSONCoordinateSchema)),
        z.array(z.array(z.array(GeoJSONCoordinateSchema)))
    ]).describe("Coordinate array matching the geometry type")
}).describe("GeoJSON Geometry object");

export const GeoJSONPropertyValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const GeoJSONFeatureSchema = z.object({
    type: z.literal('Feature'),
    geometry: GeoJSONGeometrySchema,
    properties: z.record(GeoJSONPropertyValue).describe("Feature properties")
}).describe("GeoJSON Feature object");

export const GeoJSONSchema = z.object({
    type: z.literal('FeatureCollection'),
    features: z.array(GeoJSONFeatureSchema)
}).describe("GeoJSON FeatureCollection");

export type GeoJSON = z.infer<typeof GeoJSONSchema>;
export type GeoJSONFeature = z.infer<typeof GeoJSONFeatureSchema>;
export type GeoJSONGeometry = z.infer<typeof GeoJSONGeometrySchema>;

// ─── Kinematic Snapshot ──────────────────────────────────────────────────────

/**
 * KinematicSnapshot: A timestamped position/velocity sample for telemetry.
 */
export const KinematicSnapshotSchema = z.object({
    tick: z.number().describe("Simulation tick when the snapshot was taken"),
    pos: Vector3Schema.describe("Position at this tick"),
    speedKts: z.number().describe("Speed in knots"),
    altM: z.number().describe("Altitude in meters")
}).describe("Timestamped kinematic state sample");
export type KinematicSnapshot = z.infer<typeof KinematicSnapshotSchema>;

// ─── Map Region ──────────────────────────────────────────────────────────────

/**
 * MapRegion: A geographic theater definition with WGS84 bounding box.
 */
export const MapBoundsSchema = z.object({
    minLat: z.number().describe("Southern boundary in decimal degrees"),
    maxLat: z.number().describe("Northern boundary in decimal degrees"),
    minLon: z.number().describe("Western boundary in decimal degrees"),
    maxLon: z.number().describe("Eastern boundary in decimal degrees")
}).describe("WGS84 bounding box");
export type MapBounds = z.infer<typeof MapBoundsSchema>;

export const MapRegionSchema = z.object({
    id: z.string().describe("Unique region identifier"),
    name: z.string().describe("Human-readable region name"),
    bounds: MapBoundsSchema
}).describe("A geographic theater definition");
export type MapRegion = z.infer<typeof MapRegionSchema>;

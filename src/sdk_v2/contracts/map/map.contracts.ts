import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { Vector3Schema, LlaSchema, GeoJSONSchema, MapRegionSchema } from '../domain/primitives.schema.js';

// ─── Zone Schema ─────────────────────────────────────────────────────────────

export const TacticalZoneTypeSchema = z.enum([
    'NFZ',      // No-Fly Zone
    'WEZ',      // Weapon Engagement Zone
    'ROZ',      // Restricted Operations Zone
    'SAM',      // Surface-to-Air Missile engagement zone
    'AAR',      // Air-to-Air Refueling zone
    'CUSTOM'    // Custom user-defined zone
]).describe("Tactical zone type");

export const TacticalZoneSchema = z.object({
    id: z.string().describe("Zone identifier"),
    name: z.string().describe("Zone name"),
    type: TacticalZoneTypeSchema.describe("Zone type"),
    points: z.array(Vector3Schema).describe("Polygon vertices"),
    minAltM: z.number().optional().describe("Minimum altitude in meters"),
    maxAltM: z.number().optional().describe("Maximum altitude in meters"),
    isActive: z.boolean().describe("Whether zone is currently active")
}).describe("A tactical zone definition");
export type TacticalZone = z.infer<typeof TacticalZoneSchema>;

// ─── map_list_regions ────────────────────────────────────────────────────────

export const MapListRegionsInputSchema = z.object({});

export const MapListRegionsOutputSchema = z.object({
    regions: z.array(MapRegionSchema).describe("Available geographic theaters")
});

export const mapListRegionsContract = defineContract({
    domain: 'map',
    action: 'list_regions',
    description: 'List all pre-defined geographic theaters.',
    inputSchema: MapListRegionsInputSchema,
    outputSchema: MapListRegionsOutputSchema,
    rest: { method: 'GET', path: '/map/regions' }
});

// ─── map_get_overlay ─────────────────────────────────────────────────────────

export const MapGetOverlayInputSchema = z.object({
    overlayId: z.string().describe("Overlay identifier")
});

export const MapGetOverlayOutputSchema = z.object({
    id: z.string().describe("Overlay ID"),
    name: z.string().describe("Overlay name"),
    geojson: GeoJSONSchema.describe("GeoJSON data")
});

export const mapGetOverlayContract = defineContract({
    domain: 'map',
    action: 'get_overlay',
    description: 'Fetch GeoJSON data for a map layer.',
    inputSchema: MapGetOverlayInputSchema,
    outputSchema: MapGetOverlayOutputSchema,
    rest: { method: 'GET', path: '/map/overlays/:overlayId' }
});

// ─── map_get_los ─────────────────────────────────────────────────────────────

export const MapGetLOSInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    from: Vector3Schema.describe("Observer position"),
    to: Vector3Schema.describe("Target position")
});

export const MapGetLOSOutputSchema = z.object({
    hasLOS: z.boolean().describe("Whether Line-of-Sight exists"),
    distanceM: z.number().describe("Distance between points in meters"),
    bearingDeg: z.number().describe("Bearing from observer to target"),
    terrainMaskPoints: z.array(Vector3Schema).optional().describe("Points where terrain blocks LOS")
});

export const mapGetLOSContract = defineContract({
    domain: 'map',
    action: 'get_los',
    description: 'Calculate Line-of-Sight between two coordinates.',
    inputSchema: MapGetLOSInputSchema,
    outputSchema: MapGetLOSOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/map/los' }
});

// ─── map_calculate_distance ──────────────────────────────────────────────────

export const MapCalculateDistanceInputSchema = z.object({
    from: LlaSchema.describe("Start point in WGS84"),
    to: LlaSchema.describe("End point in WGS84")
});

export const MapCalculateDistanceOutputSchema = z.object({
    distanceM: z.number().describe("Geodesic distance in meters"),
    distanceNM: z.number().describe("Geodesic distance in nautical miles"),
    bearingDeg: z.number().describe("Initial bearing in degrees"),
    reverseBearingDeg: z.number().describe("Return bearing in degrees")
});

export const mapCalculateDistanceContract = defineContract({
    domain: 'map',
    action: 'calculate_distance',
    description: 'Compute geodesic distance and bearing between two points.',
    inputSchema: MapCalculateDistanceInputSchema,
    outputSchema: MapCalculateDistanceOutputSchema,
    rest: { method: 'GET', path: '/map/distance' }
});

// ─── map_list_zones ──────────────────────────────────────────────────────────

export const MapListZonesInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    type: TacticalZoneTypeSchema.optional().describe("Filter by zone type")
});

export const MapListZonesOutputSchema = z.object({
    zones: z.array(TacticalZoneSchema).describe("Active tactical zones")
});

export const mapListZonesContract = defineContract({
    domain: 'map',
    action: 'list_zones',
    description: 'List active tactical zones (NFZ, WEZ, etc.).',
    inputSchema: MapListZonesInputSchema,
    outputSchema: MapListZonesOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/map/zones' }
});

// ─── map_update_zone ─────────────────────────────────────────────────────────

export const MapUpdateZoneInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    zoneId: z.string().describe("Zone ID to update"),
    name: z.string().optional().describe("Updated name"),
    points: z.array(Vector3Schema).optional().describe("Updated polygon"),
    isActive: z.boolean().optional().describe("Toggle zone active/inactive"),
    minAltM: z.number().optional().describe("Updated min altitude"),
    maxAltM: z.number().optional().describe("Updated max altitude")
});

export const mapUpdateZoneContract = defineContract({
    domain: 'map',
    action: 'update_zone',
    description: 'Dynamically update a tactical zone.',
    inputSchema: MapUpdateZoneInputSchema,
    outputSchema: TacticalZoneSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/map/zones/:zoneId' }
});

// ─── map_create_zone ─────────────────────────────────────────────────────────

export const MapCreateZoneInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    name: z.string().describe("Zone name"),
    type: TacticalZoneTypeSchema.describe("Zone type"),
    points: z.array(Vector3Schema).describe("Polygon vertices"),
    minAltM: z.number().optional().describe("Minimum altitude in meters"),
    maxAltM: z.number().optional().describe("Maximum altitude in meters")
});

export const mapCreateZoneContract = defineContract({
    domain: 'map',
    action: 'create_zone',
    description: 'Create a new tactical zone.',
    inputSchema: MapCreateZoneInputSchema,
    outputSchema: TacticalZoneSchema,
    rest: { method: 'POST', path: '/matches/:matchId/map/zones' }
});

// ─── map_get_elevation_profile ───────────────────────────────────────────────

export const MapGetElevationProfileInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    from: Vector3Schema.describe("Start position"),
    to: Vector3Schema.describe("End position"),
    samples: z.number().default(20).describe("Number of sampling points")
});

export const MapGetElevationProfileOutputSchema = z.object({
    profile: z.array(z.number()).describe("Array of elevation values in meters")
});

export const mapGetElevationProfileContract = defineContract({
    domain: 'map',
    action: 'get_elevation_profile',
    description: 'Returns a sample array of elevation points between two coordinates.',
    inputSchema: MapGetElevationProfileInputSchema,
    outputSchema: MapGetElevationProfileOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/map/elevation-profile' }
});

// ─── map_get_los_geodetic ────────────────────────────────────────────────────

export const MapGetLOSGeodeticInputSchema = z.object({
    from: LlaSchema.describe("Observer position (LLA)"),
    to: LlaSchema.describe("Target position (LLA)"),
    numSamples: z.number().optional().default(10).describe("Number of sampling points")
});

export const MapGetLOSGeodeticOutputSchema = z.object({
    blocked: z.boolean(),
    obstructionLla: LlaSchema.optional()
});

export const mapGetLOSGeodeticContract = defineContract({
    domain: 'map',
    action: 'get_los_geodetic',
    description: 'Calculate geodetic Line-of-Sight between two LLA coordinates.',
    inputSchema: MapGetLOSGeodeticInputSchema,
    outputSchema: MapGetLOSGeodeticOutputSchema,
    rest: { method: 'POST', path: '/map/los/geodetic' }
});

// ─── map_get_elevation_profile_geodetic ──────────────────────────────────────

export const MapGetElevationProfileGeodeticInputSchema = z.object({
    from: LlaSchema.describe("Start position (LLA)"),
    to: LlaSchema.describe("End position (LLA)"),
    points: z.number().optional().default(20).describe("Number of sampling points")
});

export const MapGetElevationProfileGeodeticOutputSchema = z.object({
    elevations: z.array(z.number())
});

export const mapGetElevationProfileGeodeticContract = defineContract({
    domain: 'map',
    action: 'get_elevation_profile_geodetic',
    description: 'Returns an elevation profile between two LLA coordinates.',
    inputSchema: MapGetElevationProfileGeodeticInputSchema,
    outputSchema: MapGetElevationProfileGeodeticOutputSchema,
    rest: { method: 'POST', path: '/map/elevation-profile/geodetic' }
});

// ─── map_convert_coordinates ─────────────────────────────────────────────────

export const MapConvertCoordinatesInputSchema = z.object({
    from: z.enum(['LLA', 'ECEF', 'ENU']).describe("Source coordinate system"),
    to: z.enum(['LLA', 'ECEF', 'ENU']).describe("Target coordinate system"),
    position: z.any().describe("Coordinate object to convert"),
    origin: LlaSchema.optional().describe("Origin for ENU conversions")
});

export const MapConvertCoordinatesOutputSchema = z.object({ 
    position: z.any() 
}).describe("The converted coordinate object");

export const mapConvertCoordinatesContract = defineContract({
    domain: 'map',
    action: 'convert',
    description: 'Utility to convert between Geodetic (LLA), ECEF, and Local Tangent Plane (ENU).',
    inputSchema: MapConvertCoordinatesInputSchema,
    outputSchema: MapConvertCoordinatesOutputSchema,
    rest: { method: 'POST', path: '/map/convert' }
});

// ─── map_get_worker_stats ──────────────────────────────────────────────────

export const MapGetWorkerStatsInputSchema = z.object({});

export const MapGetWorkerStatsOutputSchema = z.object({
    harvester: z.object({
        status: z.enum(['RUNNING', 'IDLE']),
        percentComplete: z.number(),
        stats: z.array(z.object({
            status: z.string(),
            count: z.number()
        })),
        throttle: z.string(),
        duration: z.string()
    }).describe("Status of the Harvester service"),
    cache: z.object({
        quadCount: z.number(),
        degreeCount: z.number(),
        dbSize: z.number(),
        duration: z.string()
    }).describe("Status of the Spatial Database cache"),
    memory: z.object({
        rss: z.number(),
        heapTotal: z.number(),
        heapUsed: z.number(),
        external: z.number(),
        arrayBuffers: z.number().optional()
    }).describe("Node.js memory usage"),
    uptime: z.number().describe("Uptime of the worker node in seconds")
});

export const mapGetWorkerStatsContract = defineContract({
    domain: 'map',
    action: 'get_worker_stats',
    description: 'Get internal health, memory, and cache stats for the regional map worker node.',
    inputSchema: MapGetWorkerStatsInputSchema,
    outputSchema: MapGetWorkerStatsOutputSchema,
    rest: { method: 'GET', path: '/worker/stats' }
});

// ─── map_get_harvester_status ──────────────────────────────────────────────

export const MapGetHarvesterStatusInputSchema = z.object({});
export const MapGetHarvesterStatusOutputSchema = z.object({
    status: z.enum(['RUNNING', 'IDLE']),
    percentComplete: z.number(),
    stats: z.array(z.object({
        status: z.string(),
        count: z.number()
    })),
    throttle: z.string(),
    duration: z.string()
});

export const mapGetHarvesterStatusContract = defineContract({
    domain: 'map',
    action: 'get_harvester_status',
    description: 'Get the current status of the background terrain harvester.',
    inputSchema: MapGetHarvesterStatusInputSchema,
    outputSchema: MapGetHarvesterStatusOutputSchema,
    rest: { method: 'GET', path: '/harvester/status' }
});

// ─── map_get_harvester_coverage ──────────────────────────────────────────────

export const MapGetHarvesterCoverageInputSchema = z.object({});
export const MapGetHarvesterCoverageOutputSchema = z.array(z.object({
    lat: z.number(),
    lon: z.number(),
    status: z.string()
}));

export const mapGetHarvesterCoverageContract = defineContract({
    domain: 'map',
    action: 'get_harvester_coverage',
    description: 'Get the geographic coverage map of localized terrain tiles.',
    inputSchema: MapGetHarvesterCoverageInputSchema,
    outputSchema: MapGetHarvesterCoverageOutputSchema,
    rest: { method: 'GET', path: '/harvester/coverage' }
});

// ─── map_start_harvester ─────────────────────────────────────────────────────

export const MapStartHarvesterInputSchema = z.object({});
export const MapStartHarvesterOutputSchema = z.object({
    status: z.string()
});

export const mapStartHarvesterContract = defineContract({
    domain: 'map',
    action: 'start_harvester',
    description: 'Start the background terrain harvester crawler.',
    inputSchema: MapStartHarvesterInputSchema,
    outputSchema: MapStartHarvesterOutputSchema,
    rest: { method: 'POST', path: '/harvester/start' }
});

// ─── map_stop_harvester ──────────────────────────────────────────────────────

export const MapStopHarvesterInputSchema = z.object({});
export const MapStopHarvesterOutputSchema = z.object({
    status: z.string()
});

export const mapStopHarvesterContract = defineContract({
    domain: 'map',
    action: 'stop_harvester',
    description: 'Stop the background terrain harvester crawler.',
    inputSchema: MapStopHarvesterInputSchema,
    outputSchema: MapStopHarvesterOutputSchema,
    rest: { method: 'POST', path: '/harvester/stop' }
});

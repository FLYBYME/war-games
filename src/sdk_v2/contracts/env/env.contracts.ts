import { z } from 'zod';
import { defineContract } from '../core/tool_contract.js';
import { Vector3Schema, GeoJSONSchema } from '../domain/primitives.schema.js';

// ─── Environment State ───────────────────────────────────────────────────────

export const WeatherStateSchema = z.object({
    precipitationRateMMhr: z.number().describe("Precipitation rate in mm/hr"),
    cloudCover: z.number().min(0).max(1).describe("Cloud cover fraction (0-1)"),
    seaState: z.number().min(0).max(12).describe("Sea state (0-12 Beaufort)"),
    windSpeedKts: z.number().describe("Wind speed in knots"),
    windDirDeg: z.number().describe("Wind direction in degrees"),
    visibilityNM: z.number().describe("Visibility in nautical miles"),
    temperatureC: z.number().describe("Air temperature in Celsius")
}).describe("Global weather conditions");

export const OceanographySchema = z.object({
    waterTemperatureC: z.number().describe("Water temperature in Celsius"),
    salinityPPT: z.number().describe("Salinity in parts per thousand"),
    soundSpeedMPS: z.number().describe("Sound speed in meters/second"),
    layerDepthM: z.number().describe("Thermocline layer depth in meters"),
    seaState: z.number().describe("Sea state")
}).describe("Oceanographic conditions");

export const EnvironmentStateSchema = z.object({
    weather: WeatherStateSchema.describe("Global weather"),
    oceanography: OceanographySchema.describe("Ocean conditions"),
    simulationTimeHours: z.number().describe("Simulation time of day in hours (0-24)"),
    sunElevationDeg: z.number().describe("Sun elevation angle in degrees")
}).describe("Full environment state");

// ─── env_get ─────────────────────────────────────────────────────────────────

export const EnvGetInputSchema = z.object({
    matchId: z.string().describe("The match ID")
});

export const envGetContract = defineContract({
    domain: 'env',
    action: 'get',
    description: 'Retrieve global environmental data (weather, ocean, time).',
    inputSchema: EnvGetInputSchema,
    outputSchema: EnvironmentStateSchema,
    rest: { method: 'GET', path: '/matches/:matchId/environment' }
});

// ─── env_update ──────────────────────────────────────────────────────────────

export const EnvUpdateInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    windSpeedKts: z.number().optional().describe("New wind speed"),
    windDirDeg: z.number().optional().describe("New wind direction"),
    seaState: z.number().optional().describe("New sea state"),
    visibilityNM: z.number().optional().describe("New visibility"),
    precipitationRateMMhr: z.number().optional().describe("New precipitation rate"),
    cloudCover: z.number().optional().describe("New cloud cover"),
    temperatureC: z.number().optional().describe("New temperature")
});

export const envUpdateContract = defineContract({
    domain: 'env',
    action: 'update',
    description: 'Modify global environmental conditions.',
    inputSchema: EnvUpdateInputSchema,
    outputSchema: EnvironmentStateSchema,
    rest: { method: 'PATCH', path: '/matches/:matchId/environment' }
});

// ─── env_sample_terrain ──────────────────────────────────────────────────────

export const EnvSampleTerrainInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    position: Vector3Schema.describe("Sample position")
});

export const EnvSampleTerrainOutputSchema = z.object({
    elevationM: z.number().describe("Terrain elevation in meters"),
    terrainType: z.string().describe("Terrain classification"),
    isWater: z.boolean().describe("Whether this is over water"),
    airDensity: z.number().describe("Air density at this altitude"),
    temperatureC: z.number().describe("Temperature at this altitude")
});

export const envSampleTerrainContract = defineContract({
    domain: 'env',
    action: 'sample_terrain',
    description: 'Query terrain elevation and atmospheric data at a coordinate.',
    inputSchema: EnvSampleTerrainInputSchema,
    outputSchema: EnvSampleTerrainOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/environment/terrain' }
});

// ─── env_sample_ocean ────────────────────────────────────────────────────────

export const EnvSampleOceanInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    position: Vector3Schema.describe("Sample position"),
    depthM: z.number().describe("Sampling depth in meters (positive down)")
});

export const EnvSampleOceanOutputSchema = z.object({
    soundSpeedMPS: z.number().describe("Sound speed at depth"),
    temperatureC: z.number().describe("Water temperature at depth"),
    salinityPPT: z.number().describe("Salinity at depth"),
    layerDepthM: z.number().describe("Thermocline depth"),
    isAboveLayer: z.boolean().describe("Whether sample is above the thermocline")
});

export const envSampleOceanContract = defineContract({
    domain: 'env',
    action: 'sample_ocean',
    description: 'Retrieve localized Sound Speed Profile for sonar modeling.',
    inputSchema: EnvSampleOceanInputSchema,
    outputSchema: EnvSampleOceanOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/environment/ocean' }
});

// ─── env_get_borders ─────────────────────────────────────────────────────────

export const EnvGetBordersInputSchema = z.object({
    matchId: z.string().describe("The match ID")
});

export const EnvGetBordersOutputSchema = z.object({
    borders: GeoJSONSchema.optional().describe("Geopolitical boundaries"),
    bathymetry: GeoJSONSchema.optional().describe("Bathymetric contours")
});

export const envGetBordersContract = defineContract({
    domain: 'env',
    action: 'get_borders',
    description: 'Fetch geopolitical boundaries and restricted zones.',
    inputSchema: EnvGetBordersInputSchema,
    outputSchema: EnvGetBordersOutputSchema,
    rest: { method: 'GET', path: '/matches/:matchId/environment/borders' }
});

// ─── env_set_time ────────────────────────────────────────────────────────────

export const EnvSetTimeInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    hours: z.number().min(0).max(24).describe("Time of day in hours (0-24)")
});

export const EnvSetTimeOutputSchema = z.object({
    hours: z.number().describe("New simulation time of day"),
    sunElevationDeg: z.number().describe("Sun elevation angle")
});

export const envSetTimeContract = defineContract({
    domain: 'env',
    action: 'set_time',
    description: 'Set simulation time of day (affects visual/IR sensors).',
    inputSchema: EnvSetTimeInputSchema,
    outputSchema: EnvSetTimeOutputSchema,
    rest: { method: 'PUT', path: '/matches/:matchId/environment/time' }
});

// ─── env_prefetch_terrain ────────────────────────────────────────────────────

export const EnvPrefetchTerrainInputSchema = z.object({
    matchId: z.string().describe("The match ID"),
    latMin: z.number().describe("Minimum latitude"),
    latMax: z.number().describe("Maximum latitude"),
    lonMin: z.number().describe("Minimum longitude"),
    lonMax: z.number().describe("Maximum longitude")
});

export const EnvPrefetchTerrainOutputSchema = z.object({
    queuedCount: z.number().describe("Number of tiles queued for fetching")
});

export const envPrefetchTerrainContract = defineContract({
    domain: 'env',
    action: 'prefetch_terrain',
    description: 'Command workers to cache terrain tiles for a bounding box.',
    inputSchema: EnvPrefetchTerrainInputSchema,
    outputSchema: EnvPrefetchTerrainOutputSchema,
    rest: { method: 'POST', path: '/matches/:matchId/environment/terrain/prefetch' }
});

// ─── env_get_cache_stats ─────────────────────────────────────────────────────

export const EnvGetCacheStatsInputSchema = z.object({});
export const EnvGetCacheStatsOutputSchema = z.object({
    cachedTiles: z.number().describe("Number of tiles in RAM cache"),
    activeJobs: z.number().describe("Number of worker jobs in progress")
});

export const envGetCacheStatsContract = defineContract({
    domain: 'env',
    action: 'get_cache_stats',
    description: 'Monitor disk/RAM usage of processed terrain tiles.',
    inputSchema: EnvGetCacheStatsInputSchema,
    outputSchema: EnvGetCacheStatsOutputSchema,
    rest: { method: 'GET', path: '/env/terrain/cache' }
});

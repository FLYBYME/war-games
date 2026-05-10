import { defineTool } from '../../core/tool_builder.js';
import { envSampleTerrainContract } from '../../../sdk_v2/contracts/index.js';
import { EnvironmentSystem } from '../../../engine/systems/EnvironmentSystem.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const env_sample_terrain = defineTool(envSampleTerrainContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Match handle is not a standard instance");

    const envSystem = handle.world.getSystem(EnvironmentSystem);
    if (!envSystem) throw new Error("EnvironmentSystem not found in match");

    const projection = envSystem.getProjection();
    
    // 1. Convert local meters to geodetic lat/lon
    // project() in our engine usually takes Vector3 (meters) and returns {lat, lon}
    // Let's verify GeoProjection.ts
    const geo = projection.project(input.position);

    // 2. Get elevation from TerrainService
    const elevationM = await ctx.app.terrainService.getElevation(geo.lat, geo.lon);

    // 3. Simple atmospheric model
    const temperatureC = 15 - (elevationM / 1000) * 6.5; // Standard lapse rate
    const airDensity = 1.225 * Math.exp(-elevationM / 10000); // Simple exponential decay

    return {
        elevationM,
        terrainType: elevationM > 0 ? 'Land' : 'Water',
        isWater: elevationM <= 0,
        airDensity,
        temperatureC
    };
});


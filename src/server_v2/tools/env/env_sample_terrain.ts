import { defineTool } from '../../core/tool_builder.js';
import { envSampleTerrainContract } from '../../../sdk_v2/contracts/index.js';

export const env_sample_terrain = defineTool(envSampleTerrainContract, async (input, ctx) => {
    // 1. Get elevation from TerrainService
    const elevationM = await ctx.app.terrainService.getElevation(input.position.x, input.position.y);

    // 2. Simple atmospheric model
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


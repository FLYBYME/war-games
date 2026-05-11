import { defineTool } from '../../core/tool_builder.js';
import { envSampleGeodeticContract } from '../../../sdk_v2/contracts/index.js';

export const env_sample_geodetic = defineTool(envSampleGeodeticContract, async (input, ctx) => {
    const elevationM = await ctx.app.terrainService.getElevation(input.lat, input.lon);
    
    return {
        lat: input.lat,
        lon: input.lon,
        elevationM,
        status: elevationM === 0 ? 'ESTIMATED_SEA_LEVEL' : 'PRECISION_GROUND'
    };
});

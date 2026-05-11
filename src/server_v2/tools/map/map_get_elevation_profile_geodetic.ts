import { defineTool } from '../../core/tool_builder.js';
import { mapGetElevationProfileGeodeticContract } from '../../../sdk_v2/contracts/index.js';

export const map_get_elevation_profile_geodetic = defineTool(mapGetElevationProfileGeodeticContract, async (input, ctx) => {
    const elevations = await ctx.app.terrainService.getElevationProfile(
        input.from.lat, input.from.lon,
        input.to.lat, input.to.lon,
        input.points
    );
    
    return { elevations };
});

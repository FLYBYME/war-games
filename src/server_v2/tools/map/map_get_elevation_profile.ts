import { defineTool } from '../../core/tool_builder.js';
import { mapGetElevationProfileContract } from '../../../sdk_v2/contracts/map/map.contracts.js';

export const map_get_elevation_profile = defineTool(mapGetElevationProfileContract, async (input, ctx) => {
    console.log("Executing map_get_elevation_profile", input);
    throw new Error("Not implemented");
});

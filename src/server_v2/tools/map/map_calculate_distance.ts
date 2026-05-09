import { defineTool } from '../../core/tool_builder.js';
import { mapCalculateDistanceContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const map_calculate_distance = defineTool(mapCalculateDistanceContract, async (input, ctx) => {
    // TODO: Implement map calculate_distance
    console.log("Executing map_calculate_distance", input);
    throw new Error("Not implemented");
});

import { defineTool } from '../../core/tool_builder.js';
import { mapConvertCoordinatesContract } from '../../../sdk_v2/contracts/map/map.contracts.js';

export const map_convert = defineTool(mapConvertCoordinatesContract, async (input, ctx) => {
    console.log("Executing map_convert", input);
    throw new Error("Not implemented");
});

import { defineTool } from '../../core/tool_builder.js';
import { mapGetLOSContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const map_get_los = defineTool(mapGetLOSContract, async (input, ctx) => {
    // TODO: Implement map get_los
    console.log("Executing map_get_los", input);
    throw new Error("Not implemented");
});

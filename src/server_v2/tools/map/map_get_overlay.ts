import { defineTool } from '../../core/tool_builder.js';
import { mapGetOverlayContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const map_get_overlay = defineTool(mapGetOverlayContract, async (input, ctx) => {
    // TODO: Implement map get_overlay
    console.log("Executing map_get_overlay", input);
    throw new Error("Not implemented");
});

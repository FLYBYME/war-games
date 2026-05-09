import { defineTool } from '../../core/tool_builder.js';
import { trackListContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const track_list = defineTool(trackListContract, async (input, ctx) => {
    // TODO: Implement track list
    console.log("Executing track_list", input);
    throw new Error("Not implemented");
});

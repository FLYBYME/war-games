import { defineTool } from '../../core/tool_builder.js';
import { guidanceUpdateContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const guidance_update = defineTool(guidanceUpdateContract, async (input, ctx) => {
    // TODO: Implement guidance update
    console.log("Executing guidance_update", input);
    throw new Error("Not implemented");
});

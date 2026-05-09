import { defineTool } from '../../core/tool_builder.js';
import { guidanceSetTargetContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const guidance_set_target = defineTool(guidanceSetTargetContract, async (input, ctx) => {
    // TODO: Implement guidance set_target
    console.log("Executing guidance_set_target", input);
    throw new Error("Not implemented");
});

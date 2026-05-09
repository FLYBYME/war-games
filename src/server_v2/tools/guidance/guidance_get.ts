import { defineTool } from '../../core/tool_builder.js';
import { guidanceGetContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const guidance_get = defineTool(guidanceGetContract, async (input, ctx) => {
    // TODO: Implement guidance get
    console.log("Executing guidance_get", input);
    throw new Error("Not implemented");
});

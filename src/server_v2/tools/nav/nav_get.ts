import { defineTool } from '../../core/tool_builder.js';
import { navGetContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const nav_get = defineTool(navGetContract, async (input, ctx) => {
    // TODO: Implement nav get
    console.log("Executing nav_get", input);
    throw new Error("Not implemented");
});

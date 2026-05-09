import { defineTool } from '../../core/tool_builder.js';
import { navUpdateContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const nav_update = defineTool(navUpdateContract, async (input, ctx) => {
    // TODO: Implement nav update
    console.log("Executing nav_update", input);
    throw new Error("Not implemented");
});

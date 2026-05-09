import { defineTool } from '../../core/tool_builder.js';
import { sideUpdateROEContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const side_update_roe = defineTool(sideUpdateROEContract, async (input, ctx) => {
    // TODO: Implement side update_roe
    console.log("Executing side_update_roe", input);
    throw new Error("Not implemented");
});

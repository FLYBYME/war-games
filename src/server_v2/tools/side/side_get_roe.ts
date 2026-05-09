import { defineTool } from '../../core/tool_builder.js';
import { sideGetROEContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const side_get_roe = defineTool(sideGetROEContract, async (input, ctx) => {
    // TODO: Implement side get_roe
    console.log("Executing side_get_roe", input);
    throw new Error("Not implemented");
});

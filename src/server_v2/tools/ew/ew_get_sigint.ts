import { defineTool } from '../../core/tool_builder.js';
import { ewGetSIGINTContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const ew_get_sigint = defineTool(ewGetSIGINTContract, async (input, ctx) => {
    // TODO: Implement ew get_sigint
    console.log("Executing ew_get_sigint", input);
    throw new Error("Not implemented");
});

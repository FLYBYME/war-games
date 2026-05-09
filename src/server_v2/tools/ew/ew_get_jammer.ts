import { defineTool } from '../../core/tool_builder.js';
import { ewGetJammerContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const ew_get_jammer = defineTool(ewGetJammerContract, async (input, ctx) => {
    // TODO: Implement ew get_jammer
    console.log("Executing ew_get_jammer", input);
    throw new Error("Not implemented");
});

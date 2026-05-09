import { defineTool } from '../../core/tool_builder.js';
import { navBreakFormationContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const nav_break_formation = defineTool(navBreakFormationContract, async (input, ctx) => {
    // TODO: Implement nav break_formation
    console.log("Executing nav_break_formation", input);
    throw new Error("Not implemented");
});

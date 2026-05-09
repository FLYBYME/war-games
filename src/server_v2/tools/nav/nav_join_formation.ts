import { defineTool } from '../../core/tool_builder.js';
import { navJoinFormationContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const nav_join_formation = defineTool(navJoinFormationContract, async (input, ctx) => {
    // TODO: Implement nav join_formation
    console.log("Executing nav_join_formation", input);
    throw new Error("Not implemented");
});

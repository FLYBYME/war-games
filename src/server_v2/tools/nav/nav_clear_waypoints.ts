import { defineTool } from '../../core/tool_builder.js';
import { navClearWaypointsContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const nav_clear_waypoints = defineTool(navClearWaypointsContract, async (input, ctx) => {
    // TODO: Implement nav clear_waypoints
    console.log("Executing nav_clear_waypoints", input);
    throw new Error("Not implemented");
});

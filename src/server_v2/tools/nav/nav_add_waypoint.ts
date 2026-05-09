import { defineTool } from '../../core/tool_builder.js';
import { navAddWaypointContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const nav_add_waypoint = defineTool(navAddWaypointContract, async (input, ctx) => {
    // TODO: Implement nav add_waypoint
    console.log("Executing nav_add_waypoint", input);
    throw new Error("Not implemented");
});

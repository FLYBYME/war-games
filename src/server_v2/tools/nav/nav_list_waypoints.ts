import { defineTool } from '../../core/tool_builder.js';
import { navListWaypointsContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const nav_list_waypoints = defineTool(navListWaypointsContract, async (input, ctx) => {
    // TODO: Implement nav list_waypoints
    console.log("Executing nav_list_waypoints", input);
    throw new Error("Not implemented");
});

import { defineTool } from '../../core/tool_builder.js';
import { navClearWaypointsContract } from '../../../sdk_v2/contracts/index.js';
import { ClearWaypointsCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const nav_clear_waypoints = defineTool(navClearWaypointsContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new ClearWaypointsCommand(input.entityId));

    return { success: true };
});


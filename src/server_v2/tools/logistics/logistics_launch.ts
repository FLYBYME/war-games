import { defineTool } from '../../core/tool_builder.js';
import { logisticsLaunchContract } from '../../../sdk_v2/contracts/index.js';
import { LaunchAircraftCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const logistics_launch = defineTool(logisticsLaunchContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new LaunchAircraftCommand(input.entityId));

    return {
        success: true,
        newState: 'Takeoff'
    };
});

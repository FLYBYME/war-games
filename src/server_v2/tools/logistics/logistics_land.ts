import { defineTool } from '../../core/tool_builder.js';
import { logisticsLandContract } from '../../../sdk_v2/contracts/index.js';
import { LandAtFacilityCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const logistics_land = defineTool(logisticsLandContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new LandAtFacilityCommand(input.entityId, input.facilityId));

    return {
        success: true,
        newState: 'Landing'
    };
});

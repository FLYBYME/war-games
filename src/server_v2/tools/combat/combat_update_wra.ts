import { defineTool } from '../../core/tool_builder.js';
import { combatUpdateWRAContract } from '../../../sdk_v2/contracts/index.js';
import { UpdateWRARulesCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const combat_update_wra = defineTool(combatUpdateWRAContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new UpdateWRARulesCommand(
        input.entityId,
        input.rules as any
    ));

    return {
        rules: input.rules
    };
});

import { defineTool } from '../../core/tool_builder.js';
import { navBreakFormationContract } from '../../../sdk_v2/contracts/index.js';
import { BreakFormationCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const nav_break_formation = defineTool(navBreakFormationContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new BreakFormationCommand(input.entityId));

    return { success: true };
});


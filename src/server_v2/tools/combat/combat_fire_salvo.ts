import { defineTool } from '../../core/tool_builder.js';
import { combatFireSalvoContract } from '../../../sdk_v2/contracts/index.js';
import { FireSalvoCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const combat_fire_salvo = defineTool(combatFireSalvoContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new FireSalvoCommand(
        input.entityId,
        input.mountIndex,
        input.targetId,
        input.quantity
    ));

    return {
        success: true,
        munitionIds: [] // Will be populated in next ticks by engine
    };
});

import { defineTool } from '../../core/tool_builder.js';
import { combatUpdateROEContract } from '../../../sdk_v2/contracts/index.js';
import { SetROECommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const combat_update_roe = defineTool(combatUpdateROEContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new SetROECommand(
        input.entityId,
        input.roe
    ));

    return {
        entityId: input.entityId,
        roe: input.roe
    };
});

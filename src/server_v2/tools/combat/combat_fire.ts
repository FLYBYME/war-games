import { defineTool } from '../../core/tool_builder.js';
import { combatFireContract } from '../../../sdk_v2/contracts/index.js';
import { FireWeaponCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const combat_fire = defineTool(combatFireContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new FireWeaponCommand(
        input.entityId,
        input.mountIndex,
        input.targetId
    ));

    return {
        success: true
    };
});

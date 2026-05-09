import { defineTool } from '../../core/tool_builder.js';
import { ministryUpdateDoctrineContract } from '../../../sdk_v2/contracts/index.js';
import { SetIntentCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const ministry_update_doctrine = defineTool(ministryUpdateDoctrineContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new SetIntentCommand({
        type: 'Doctrine',
        side: input.side as any,
        aggressiveness: input.aggressiveness,
        riskTolerance: input.riskTolerance
    }));

    return {
        success: true
    };
});

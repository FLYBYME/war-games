import { defineTool } from '../../core/tool_builder.js';
import { sideUpdateROEContract } from '../../../sdk_v2/contracts/index.js';
import { SetIntentCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const side_update_roe = defineTool(sideUpdateROEContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    // Use SetIntentCommand for side-wide doctrine updates
    handle.world.queueExternalCommand(new SetIntentCommand({
        type: 'Doctrine',
        side: input.side as any,
        roe: input.roe as any,
        emcon: input.emcon as any
    }));

    return {
        side: input.side as any,
        roe: input.roe || 'Tight',
        emcon: input.emcon || 'Alpha'
    };
});

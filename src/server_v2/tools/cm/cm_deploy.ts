import { defineTool } from '../../core/tool_builder.js';
import { cmDeployContract } from '../../../sdk_v2/contracts/index.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const cm_deploy = defineTool(cmDeployContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    // Placeholder: Countermeasure logic not yet in engine
    return {
        success: true,
        remaining: 10
    };
});

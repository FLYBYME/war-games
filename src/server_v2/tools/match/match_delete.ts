import { defineTool } from '../../core/tool_builder.js';
import { matchDeleteContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const match_delete = defineTool(matchDeleteContract, async (input, ctx) => {
    const success = ctx.app.matchService.deleteMatch(input.matchId);
    return { success };
});

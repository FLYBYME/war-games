import { defineTool } from '../../core/tool_builder.js';
import { cmGetInventoryContract } from '../../../sdk_v2/contracts/index.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const cm_get_inventory = defineTool(cmGetInventoryContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    // Placeholder
    return {
        inventory: [
            { type: 'Chaff' as const, remaining: 30, total: 30 },
            { type: 'Flare' as const, remaining: 30, total: 30 }
        ]
    };
});

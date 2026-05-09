import { defineTool } from '../../core/tool_builder.js';
import { mapListZonesContract } from '../../../sdk_v2/contracts/index.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const map_list_zones = defineTool(mapListZonesContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    return {
        zones: Array.from(handle.zones.values())
    };
});


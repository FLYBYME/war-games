import { defineTool } from '../../core/tool_builder.js';
import { entityDeleteContract } from '../../../sdk_v2/contracts/index.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const entity_delete = defineTool(entityDeleteContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) {
        return { success: false };
    }

    handle.world.removeEntity(input.entityId);

    return {
        success: true
    };
});

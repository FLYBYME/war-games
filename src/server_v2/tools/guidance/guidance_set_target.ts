import { defineTool } from '../../core/tool_builder.js';
import { guidanceSetTargetContract } from '../../../sdk_v2/contracts/index.js';
import { GuidanceComponent } from '../../../engine/components/Guidance.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const guidance_set_target = defineTool(guidanceSetTargetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const guidance = entity.getComponent(GuidanceComponent);
    if (!guidance) throw new Error(`Entity ${input.entityId} has no GuidanceComponent`);

    guidance.targetId = input.targetId;

    return {
        success: true,
        targetId: input.targetId
    };
});

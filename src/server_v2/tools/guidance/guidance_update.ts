import { defineTool } from '../../core/tool_builder.js';
import { guidanceUpdateContract } from '../../../sdk_v2/contracts/index.js';
import { GuidanceComponent } from '../../../engine/components/Guidance.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const guidance_update = defineTool(guidanceUpdateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const guidance = entity.getComponent(GuidanceComponent);
    if (!guidance) throw new Error(`Entity ${input.entityId} has no GuidanceComponent`);

    if (input.maneuverabilityG !== undefined) guidance.maneuverabilityG = input.maneuverabilityG;
    if (input.guidanceType !== undefined) guidance.guidanceType = input.guidanceType as any;

    return {
        entityId: entity.id,
        guidanceType: guidance.guidanceType as any,
        targetId: guidance.targetId,
        hasLock: guidance.hasLock,
        lastLockTick: guidance.lastLockTick,
        maneuverabilityG: guidance.maneuverabilityG,
        illuminatorId: guidance.illuminatorId
    };
});

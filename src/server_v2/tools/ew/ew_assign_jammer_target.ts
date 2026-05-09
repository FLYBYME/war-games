import { defineTool } from '../../core/tool_builder.js';
import { ewAssignJammerTargetContract } from '../../../sdk_v2/contracts/index.js';
import { JammerComponent } from '../../../engine/components/ElectronicWarfare.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const ew_assign_jammer_target = defineTool(ewAssignJammerTargetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const jammer = entity.getComponent(JammerComponent);
    if (!jammer) throw new Error(`Entity ${input.entityId} has no JammerComponent`);

    jammer.targetId = input.targetId;

    return {
        success: true,
        targetId: input.targetId
    };
});

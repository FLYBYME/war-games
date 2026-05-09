import { defineTool } from '../../core/tool_builder.js';
import { kinematicsApplyForceContract } from '../../../sdk_v2/contracts/index.js';
import { ApplyForceCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const kinematics_apply_force = defineTool(kinematicsApplyForceContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    handle.world.queueExternalCommand(new ApplyForceCommand(
        input.entityId,
        input.force.x,
        input.force.y,
        input.force.z
    ));

    return { success: true };
});


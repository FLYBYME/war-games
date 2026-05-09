import { defineTool } from '../../core/tool_builder.js';
import { propulsionUpdateContract } from '../../../sdk_v2/contracts/index.js';
import { SetThrottleCommand } from '../../../engine/core/Command.js';
import { PropulsionComponent } from '../../../engine/components/Propulsion.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const propulsion_update = defineTool(propulsionUpdateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    if (input.throttle !== undefined) {
        handle.world.queueExternalCommand(new SetThrottleCommand(input.entityId, input.throttle));
    }

    const prop = entity.getComponent(PropulsionComponent);

    return {
        entityId: entity.id,
        throttle: input.throttle ?? (prop?.throttle || 0),
        currentThrustN: prop?.currentThrustN || 0,
        maxThrustDryN: prop?.maxThrustDryN || 0,
        maxThrustAbN: prop?.maxThrustAbN || 0,
        engineState: prop?.state as any || 'Off',
        sfcDry: prop?.sfcDry || 0,
        sfcAb: prop?.sfcAb || 0
    };
});

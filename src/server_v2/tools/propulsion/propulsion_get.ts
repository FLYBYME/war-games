import { defineTool } from '../../core/tool_builder.js';
import { propulsionGetContract } from '../../../sdk_v2/contracts/index.js';
import { PropulsionComponent } from '../../../engine/components/Propulsion.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const propulsion_get = defineTool(propulsionGetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const prop = entity.getComponent(PropulsionComponent);
    if (!prop) throw new Error(`Entity ${input.entityId} has no PropulsionComponent`);

    return {
        entityId: entity.id,
        throttle: prop.throttle,
        currentThrustN: prop.currentThrustN,
        maxThrustDryN: prop.maxThrustDryN,
        maxThrustAbN: prop.maxThrustAbN,
        engineState: prop.state as any,
        sfcDry: prop.sfcDry,
        sfcAb: prop.sfcAb
    };
});

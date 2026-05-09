import { defineTool } from '../../core/tool_builder.js';
import { propulsionSetStateContract } from '../../../sdk_v2/contracts/index.js';
import { SetThrottleCommand } from '../../../engine/core/Command.js';
import { PropulsionComponent } from '../../../engine/components/Propulsion.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const propulsion_set_state = defineTool(propulsionSetStateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const prop = entity.getComponent(PropulsionComponent);
    if (!prop) throw new Error(`Entity ${input.entityId} has no PropulsionComponent`);

    // Map state to throttle values
    let throttle = 0;
    switch (input.state) {
        case 'Off': throttle = 0; break;
        case 'Starting': throttle = 0.1; break;
        case 'Dry': throttle = 0.5; break;
        case 'Afterburner': throttle = 1.0; break;
    }

    handle.world.queueExternalCommand(new SetThrottleCommand(input.entityId, throttle));

    return {
        entityId: entity.id,
        throttle,
        currentThrustN: prop.currentThrustN,
        maxThrustDryN: prop.maxThrustDryN,
        maxThrustAbN: prop.maxThrustAbN,
        engineState: input.state,
        sfcDry: prop.sfcDry,
        sfcAb: prop.sfcAb
    };
});

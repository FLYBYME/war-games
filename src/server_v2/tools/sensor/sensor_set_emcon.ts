import { defineTool } from '../../core/tool_builder.js';
import { sensorSetEmconContract } from '../../../sdk_v2/contracts/index.js';
import { SetEMCONCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const sensor_set_emcon = defineTool(sensorSetEmconContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new SetEMCONCommand(input.entityId, input.state));

    return { 
        entityId: input.entityId,
        emconState: input.state
    };
});

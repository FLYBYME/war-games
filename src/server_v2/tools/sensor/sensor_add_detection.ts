import { defineTool } from '../../core/tool_builder.js';
import { sensorAddDetectionContract } from '../../../sdk_v2/contracts/index.js';
import { AddDetectionCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const sensor_add_detection = defineTool(sensorAddDetectionContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new AddDetectionCommand(
        input.entityId,
        input.targetId
    ));

    return {
        success: true
    };
});

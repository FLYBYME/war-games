import { defineTool } from '../../core/tool_builder.js';
import { simSetSpeedContract } from '../../../sdk_v2/contracts/index.js';
import { SetSimulationSpeedCommand } from '../../../engine/core/Command.js';

export const sim_set_speed = defineTool(simSetSpeedContract, async (input, ctx) => {
    const match = ctx.app.matchService.getMatch(input.matchId);
    
    match.world.queueExternalCommand(new SetSimulationSpeedCommand(
        input.timeCompression,
        match.world.isPaused
    ));

    return {
        tick: match.world.currentTick,
        isPaused: match.world.isPaused,
        timeCompression: input.timeCompression
    };
});

import { defineTool } from '../../core/tool_builder.js';
import { simPauseContract } from '../../../sdk_v2/contracts/index.js';
import { SetSimulationSpeedCommand } from '../../../engine/core/Command.js';

export const sim_pause = defineTool(simPauseContract, async (input, ctx) => {
    const match = ctx.app.matchService.getMatch(input.matchId);
    
    match.world.queueExternalCommand(new SetSimulationSpeedCommand(
        match.world.timeCompression,
        true
    ));

    return {
        tick: match.world.currentTick,
        isPaused: true,
        timeCompression: match.world.timeCompression
    };
});

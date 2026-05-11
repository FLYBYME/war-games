import { defineTool } from '../../core/tool_builder.js';
import { simResumeContract } from '../../../sdk_v2/contracts/index.js';
import { SetSimulationSpeedCommand } from '../../../engine/core/Command.js';

export const sim_resume = defineTool(simResumeContract, async (input, ctx) => {
    const match = ctx.app.matchService.getMatch(input.matchId);
    
    match.world.queueExternalCommand(new SetSimulationSpeedCommand(
        match.world.timeCompression,
        false
    ));

    return {
        tick: match.world.currentTick,
        isPaused: false,
        timeCompression: match.world.timeCompression
    };
});

import { defineTool } from '../../core/tool_builder.js';
import { simUpdateContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

import { isMatchHandle } from '../../services/MatchService.js';

export const sim_update = defineTool(simUpdateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");
    
    if (input.isPaused !== undefined) {
        handle.isPaused = input.isPaused;
    }
    
    if (input.timeCompression !== undefined) {
        handle.timeCompression = input.timeCompression;
    }
    
    return {
        tick: handle.world.currentTick,
        isPaused: handle.isPaused,
        timeCompression: handle.timeCompression
    };
});

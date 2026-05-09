import { defineTool } from '../../core/tool_builder.js';
import { simGetContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

import { isMatchHandle } from '../../services/MatchService.js';

export const sim_get = defineTool(simGetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");
    return {
        tick: handle.world.currentTick,
        timestamp: handle.world.timestamp,
        isPaused: handle.isPaused,
        timeCompression: handle.timeCompression,
        tickRateHz: 10,
        elapsedSeconds: handle.world.timestamp
    };
});

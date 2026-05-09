import { defineTool } from '../../core/tool_builder.js';
import { simStepContract } from '../../../sdk_v2/contracts/index.js';

import { isMatchHandle } from '../../services/MatchService.js';

export const sim_step = defineTool(simStepContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");
    
    const ticks = input.ticks || 1;
    for (let i = 0; i < ticks; i++) {
        await handle.world.tick(0.1);
        
        // Yield every 100 ticks to allow metrics/polling requests to get through
        if (i % 100 === 0) {
            await new Promise(resolve => setImmediate(resolve));
        }
    }
    
    return {
        tick: handle.world.currentTick,
        elapsedTicks: ticks
    };
});

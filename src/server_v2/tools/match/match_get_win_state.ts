import { defineTool } from '../../core/tool_builder.js';
import { matchGetWinStateContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

import { isMatchHandle } from '../../services/MatchService.js';

export const match_get_win_state = defineTool(matchGetWinStateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");
    
    // Very simple win logic based on losses
    let winType: 'red_victory' | 'blue_victory' | 'draw' | 'undetermined' = 'undetermined' as const;
    let winReason = 'Simulation ongoing';
    
    const blueLosses = handle.world.stats.blue;
    const redLosses = handle.world.stats.red;
    
    if (redLosses > 10 && blueLosses === 0) {
        winType = 'blue_victory' as const;
        winReason = 'Red forces suffered significant losses';
    } else if (blueLosses > 10 && redLosses === 0) {
        winType = 'red_victory' as const;
        winReason = 'Blue forces suffered significant losses';
    }
    
    return {
        winType,
        winReason,
        score: {
            blue: blueLosses,
            red: redLosses,
            munitionsExpended: handle.world.stats.munitionsExpended
        }
    };
});

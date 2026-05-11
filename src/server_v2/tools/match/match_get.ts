import { defineTool } from '../../core/tool_builder.js';
import { matchGetContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

import { isMatchHandle } from '../../services/MatchService.js';

export const match_get = defineTool(matchGetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");
    
    // In a real implementation, we would join with the DB to get description, etc.
    // For now, we return the live state from the handle.
    return {
        id: handle.id,
        name: handle.name,
        description: 'Live simulation match',
        status: handle.isPaused ? 'paused' : 'running',
        winType: 'undetermined',
        scenarioId: handle.scenarioId,
        createdAt: new Date(), 
        updatedAt: new Date(),
        currentTurn: handle.currentTick,
        maxTurns: 10000,
        winReason: 'N/A',
        score: {
            blue: handle.world.stats.blue,
            red: handle.world.stats.red,
            munitionsExpended: handle.world.stats.munitionsExpended
        }
    };
});

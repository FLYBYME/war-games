import { defineTool } from '../../core/tool_builder.js';
import { matchUpdateContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

import { isMatchHandle } from '../../services/MatchService.js';

export const match_update = defineTool(matchUpdateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");
    
    // Update metadata (in a real app, update DB too)
    // For now we just return the updated record representation
    
    return {
        id: handle.id,
        name: input.name || handle.name,
        description: input.description || 'Updated match state',
        status: handle.isPaused ? 'paused' as const : 'running' as const,
        winType: 'undetermined' as const,
        scenarioId: handle.scenarioId,
        createdAt: new Date(),
        updatedAt: new Date(),
        currentTurn: handle.currentTick,
        maxTurns: input.maxTurns || 10000,
        winReason: 'N/A',
        score: {
            blue: handle.world.stats.blue,
            red: handle.world.stats.red,
            munitionsExpended: handle.world.stats.munitionsExpended
        }
    };
});

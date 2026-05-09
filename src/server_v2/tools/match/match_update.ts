import { defineTool } from '../../core/tool_builder.js';
import { matchUpdateContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path
import { db } from '../../db/db.js';
import { matches } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { isMatchHandle } from '../../services/MatchService.js';

export const match_update = defineTool(matchUpdateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");
    
    // Update metadata in DB
    db.update(matches)
        .set({
            name: input.name || handle.name,
            maxTurns: input.maxTurns || 10000,
            updatedAt: new Date()
        })
        .where(eq(matches.id, input.matchId))
        .run();
    
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

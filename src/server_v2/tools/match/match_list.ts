import { defineTool } from '../../core/tool_builder.js';
import { matchListContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path
import { isMatchHandle } from '../../services/MatchService.js';

export const match_list = defineTool(matchListContract, async (_input, ctx) => {
    const matches = ctx.app.matchService.listMatches();
    return {
        matches: matches.map(m => ({
            id: m.id,
            name: m.name,
            description: 'Live simulation match',
            status: m.isPaused ? 'paused' as const : 'running' as const,
            winType: 'undetermined' as const,
            scenarioId: m.scenarioId,
            createdAt: new Date(), 
            updatedAt: new Date(),
            currentTurn: m.currentTick,
            maxTurns: 10000,
            winReason: 'N/A',
            score: {
                blue: isMatchHandle(m) ? m.world.stats.blue : 0,
                red: isMatchHandle(m) ? m.world.stats.red : 0,
                munitionsExpended: isMatchHandle(m) ? m.world.stats.munitionsExpended : 0
            }
        })),
        totalCount: matches.length
    };
});

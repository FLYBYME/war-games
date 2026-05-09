import { defineTool } from '../../core/tool_builder.js';
import { matchCreateContract } from '../../../sdk_v2/contracts/index.js';

export const match_create = defineTool(matchCreateContract, async (input, ctx) => {
    const handle = await ctx.app.matchService.createMatch(input.scenarioId, input.name);
    
    return {
        id: handle.id,
        name: handle.name,
        description: input.description || 'New Match',
        scenarioId: handle.scenarioId,
        status: 'initializing' as const,
        winType: 'undetermined' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        currentTurn: 0,
        maxTurns: input.maxTurns || 10000,
        winReason: 'Match in progress' as const,
        score: {
            blue: 0,
            red: 0,
            munitionsExpended: 0
        }
    };
});

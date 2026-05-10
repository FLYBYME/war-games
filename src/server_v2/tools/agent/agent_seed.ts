import { defineTool } from '../../core/tool_builder.js';
import { agentSeedContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const agent_seed = defineTool(agentSeedContract, async (input, ctx) => {
    return await ctx.app.agentService.seedAgents(input.overwrite);
});

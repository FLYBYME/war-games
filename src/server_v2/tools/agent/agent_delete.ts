import { defineTool } from '../../core/tool_builder.js';
import { agentDeleteContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const agent_delete = defineTool(agentDeleteContract, async (input, ctx) => {
    const success = await ctx.app.agentService.deleteAgent(input.agentId);
    return { success };
});

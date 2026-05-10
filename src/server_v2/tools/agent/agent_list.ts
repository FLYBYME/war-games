import { defineTool } from '../../core/tool_builder.js';
import { agentListContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const agent_list = defineTool(agentListContract, async (input, ctx) => {
    return ctx.app.agentService.listAgents();
});

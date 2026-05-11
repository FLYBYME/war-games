import { defineTool } from '../../core/tool_builder.js';
import { agentUpdateContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const agent_update = defineTool(agentUpdateContract, async (input, ctx) => {
    const { agentId, ...data } = input;
    return ctx.app.agentService.updateAgent(agentId, data);
});

import { defineTool } from '../../core/tool_builder.js';
import { agentCreateContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const agent_create = defineTool(agentCreateContract, async (input, ctx) => {
    return ctx.app.agentService.createAgent(input);
});

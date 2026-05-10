import { defineTool } from '../../core/tool_builder.js';
import { threadCreateContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const agent_thread_create = defineTool(threadCreateContract, async (input, ctx) => {
    return ctx.app.agentService.createThread(input);
});

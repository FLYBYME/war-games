import { defineTool } from '../../core/tool_builder.js';
import { threadHistoryContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const agent_thread_history = defineTool(threadHistoryContract, async (input, ctx) => {
    return ctx.app.agentService.getThreadHistory(input.threadId);
});

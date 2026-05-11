import { defineTool } from '../../core/tool_builder.js';
import { threadDeleteContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const thread_delete = defineTool(threadDeleteContract, async (input, ctx) => {
    const success = await ctx.app.agentService.deleteThread(input.threadId);
    return { success };
});

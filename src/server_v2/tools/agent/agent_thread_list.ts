import { defineTool } from '../../core/tool_builder.js';
import { threadListContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const thread_list = defineTool(threadListContract, async (input, ctx) => {
    return ctx.app.agentService.listThreads(input);
});

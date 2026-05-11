import { defineTool } from '../../core/tool_builder.js';
import { threadUpdateContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const thread_update = defineTool(threadUpdateContract, async (input, ctx) => {
    const { threadId, ...data } = input;
    return ctx.app.agentService.updateThread(threadId, data);
});

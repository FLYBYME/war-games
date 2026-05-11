import { defineTool } from '../../core/tool_builder.js';
import { messageDeleteContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const message_delete = defineTool(messageDeleteContract, async (input, ctx) => {
    const success = await ctx.app.agentService.deleteMessage(input.messageId);
    return { success };
});

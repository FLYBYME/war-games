import { defineTool } from '../../core/tool_builder.js';
import { messageUpdateContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const message_update = defineTool(messageUpdateContract, async (input, ctx) => {
    const { messageId, ...data } = input;
    return ctx.app.agentService.updateMessage(messageId, data);
});

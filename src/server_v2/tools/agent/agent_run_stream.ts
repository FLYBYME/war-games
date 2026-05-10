import { defineTool } from '../../core/tool_builder.js';
import { agentRunStreamContract } from '../../../sdk_v2/contracts/agent/agent.contracts.js';

export const agent_run_stream = defineTool(agentRunStreamContract, async function* (input, ctx) {
    yield* ctx.app.agentService.runAgentStream(input.threadId, input.prompt, input.allowedTools);
});

import { defineTool } from '../../core/tool_builder.js';
import { workerGetStatsContract } from '../../../sdk_v2/contracts/index.js';

export const worker_get_stats = defineTool(workerGetStatsContract, async (input, ctx) => {
    return ctx.app.workerService.getPool(input.poolName).getStats();
});

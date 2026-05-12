import { defineTool } from '../../core/tool_builder.js';
import { mapGetWorkerStatsContract } from '../../../sdk_v2/contracts/index.js';

export const map_get_worker_stats = defineTool(mapGetWorkerStatsContract, async (input, ctx) => {
    return ctx.app.terrainService.getWorkerStats();
});

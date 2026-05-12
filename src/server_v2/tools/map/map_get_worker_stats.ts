import { defineTool } from '../../core/tool_builder.js';
import { mapGetWorkerStatsContract } from '../../../sdk_v2/contracts/index.js';

export const map_get_worker_stats = defineTool(mapGetWorkerStatsContract, async (input, ctx) => {
    if (!ctx.app.harvesterService || !ctx.app.spatialDb) {
        throw new Error("Worker stats are only available on the remote map worker node.");
    }

    return {
        harvester: ctx.app.harvesterService.getStatus(),
        cache: ctx.app.spatialDb.getStats(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
    };
});

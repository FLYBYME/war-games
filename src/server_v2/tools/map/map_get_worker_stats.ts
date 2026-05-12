import { defineTool } from '../../core/tool_builder.js';
import { mapGetWorkerStatsContract } from '../../../sdk_v2/contracts/index.js';

export const map_get_worker_stats = defineTool(mapGetWorkerStatsContract, async (input, ctx) => {
    const harvester = ctx.app.harvesterService?.getStatus() || {
        status: 'IDLE' as const,
        percentComplete: 0,
        stats: [],
        throttle: 'OFFLINE',
        duration: '0'
    };

    const cache = ctx.app.spatialDb?.getStats() || {
        quadCount: 0,
        degreeCount: 0,
        dbSize: 0,
        duration: '0'
    };

    return {
        harvester,
        cache,
        memory: process.memoryUsage(),
        uptime: process.uptime()
    };
});

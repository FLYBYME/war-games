import { defineTool } from '../../core/tool_builder.js';
import { simGetMetricsContract } from '../../../sdk_v2/contracts/index.js';

export const sim_get_metrics = defineTool(simGetMetricsContract, async (input, ctx) => {
    const memory = process.memoryUsage();
    
    let tracerSize: number | undefined;
    let octreeNodeCount: number | undefined;

    if (input.matchId) {
        const handle = ctx.app.matchService.getMatch(input.matchId);
        if (handle) {
            tracerSize = handle.world.getTracerSize();
            octreeNodeCount = handle.world.getOctreeNodeCount();
        }
    }

    return {
        memory: {
            rss: memory.rss,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            external: memory.external
        },
        uptime: process.uptime(),
        tracerSize,
        octreeNodeCount
    };
});

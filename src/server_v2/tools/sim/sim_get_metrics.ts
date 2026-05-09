import { defineTool } from '../../core/tool_builder.js';
import { simGetMetricsContract } from '../../../sdk_v2/contracts/index.js';

export const sim_get_metrics = defineTool(simGetMetricsContract, async (_input, _ctx) => {
    const memory = process.memoryUsage();
    
    return {
        memory: {
            rss: memory.rss,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            external: memory.external
        },
        uptime: process.uptime()
    };
});

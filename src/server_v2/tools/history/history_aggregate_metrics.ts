import { defineTool } from '../../core/tool_builder.js';
import { historyAggregateMetricsContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const history_aggregate_metrics = defineTool(historyAggregateMetricsContract, async (input, ctx) => {
    // TODO: Implement history aggregate_metrics
    console.log("Executing history_aggregate_metrics", input);
    throw new Error("Not implemented");
});

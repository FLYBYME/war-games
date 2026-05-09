import { defineTool } from '../../core/tool_builder.js';
import { workerListContract } from '../../../sdk_v2/contracts/index.js';

export const worker_list = defineTool(workerListContract, async (input, ctx) => {
    return {
        pools: ctx.app.workerService.listPools()
    };
});

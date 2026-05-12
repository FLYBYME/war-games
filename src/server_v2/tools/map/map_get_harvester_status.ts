import { defineTool } from '../../core/tool_builder.js';
import { mapGetHarvesterStatusContract } from '../../../sdk_v2/contracts/index.js';

export const map_get_harvester_status = defineTool(mapGetHarvesterStatusContract, async (input, ctx) => {
    if (!ctx.app.harvesterService) {
        throw new Error("Harvester tools are only available on the remote map worker node.");
    }
    return ctx.app.harvesterService.getStatus();
});

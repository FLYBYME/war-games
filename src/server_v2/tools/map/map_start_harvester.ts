import { defineTool } from '../../core/tool_builder.js';
import { mapStartHarvesterContract } from '../../../sdk_v2/contracts/index.js';

export const map_start_harvester = defineTool(mapStartHarvesterContract, async (input, ctx) => {
    if (!ctx.app.harvesterService) {
        throw new Error("Harvester tools are only available on the remote map worker node.");
    }
    void ctx.app.harvesterService.start();
    return { status: 'STARTED' };
});

import { defineTool } from '../../core/tool_builder.js';
import { mapStopHarvesterContract } from '../../../sdk_v2/contracts/index.js';

export const map_stop_harvester = defineTool(mapStopHarvesterContract, async (input, ctx) => {
    if (!ctx.app.harvesterService) {
        throw new Error("Harvester tools are only available on the remote map worker node.");
    }
    ctx.app.harvesterService.stop();
    return { status: 'STOPPED' };
});

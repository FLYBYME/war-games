import { defineTool } from '../../core/tool_builder.js';
import { mapStopHarvesterContract } from '../../../sdk_v2/contracts/index.js';

export const map_stop_harvester = defineTool(mapStopHarvesterContract, async (input, ctx) => {
    await ctx.app.terrainService.stopHarvester();
    return { status: 'STOPPED' };
});

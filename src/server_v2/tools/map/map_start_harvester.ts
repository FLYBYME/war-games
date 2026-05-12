import { defineTool } from '../../core/tool_builder.js';
import { mapStartHarvesterContract } from '../../../sdk_v2/contracts/index.js';

export const map_start_harvester = defineTool(mapStartHarvesterContract, async (input, ctx) => {
    await ctx.app.terrainService.startHarvester();
    return { status: 'STARTED' };
});

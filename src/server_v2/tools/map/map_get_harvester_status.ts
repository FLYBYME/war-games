import { defineTool } from '../../core/tool_builder.js';
import { mapGetHarvesterStatusContract } from '../../../sdk_v2/contracts/index.js';

export const map_get_harvester_status = defineTool(mapGetHarvesterStatusContract, async (input, ctx) => {
    return ctx.app.terrainService.getHarvesterStatus();
});

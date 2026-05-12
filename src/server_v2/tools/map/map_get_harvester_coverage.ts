import { defineTool } from '../../core/tool_builder.js';
import { mapGetHarvesterCoverageContract } from '../../../sdk_v2/contracts/index.js';

export const map_get_harvester_coverage = defineTool(mapGetHarvesterCoverageContract, async (input, ctx) => {
    return ctx.app.terrainService.getHarvesterCoverage();
});

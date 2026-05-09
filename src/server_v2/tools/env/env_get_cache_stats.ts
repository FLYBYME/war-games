import { defineTool } from '../../core/tool_builder.js';
import { envGetCacheStatsContract } from '../../../sdk_v2/contracts/index.js';

export const env_get_cache_stats = defineTool(envGetCacheStatsContract, async (input, ctx) => {
    return ctx.app.terrainService.getCacheStats();
});

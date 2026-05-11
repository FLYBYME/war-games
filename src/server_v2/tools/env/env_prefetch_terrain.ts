import { defineTool } from '../../core/tool_builder.js';
import { envPrefetchTerrainContract } from '../../../sdk_v2/contracts/index.js';

export const env_prefetch_terrain = defineTool(envPrefetchTerrainContract, async (input, ctx) => {
    let queuedCount = 0;

    for (let lat = Math.floor(input.latMin); lat <= Math.floor(input.latMax); lat++) {
        for (let lon = Math.floor(input.lonMin); lon <= Math.floor(input.lonMax); lon++) {
            // Initiate the fetch using the targetResolution from input
            ctx.app.terrainService.getTile(lat, lon, input.targetResolution).catch(err => {
                console.error(`Failed to prefetch tile ${lat},${lon} @ res ${input.targetResolution}:`, err);
            });
            queuedCount++;
        }
    }

    return { queuedCount };
});

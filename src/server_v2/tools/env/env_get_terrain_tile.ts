import { defineTool } from '../../core/tool_builder.js';
import { envGetTerrainTileContract } from '../../../sdk_v2/contracts/index.js';
import { WgtFormat } from '../../../engine/environment/utils/WgtFormat.js';

export const env_get_terrain_tile = defineTool(envGetTerrainTileContract, async (input, ctx) => {
    const tile = await ctx.app.terrainService.getTile(input.lat, input.lon, input.targetResolution);
    
    const encoded = WgtFormat.encode(
        tile.resolution,
        tile.lat,
        tile.lon,
        tile.data
    );

    // Fastify/SDK will handle Uint8Array if configured, 
    // ensuring the UI gets a proper binary buffer.
    return {
        lat: tile.lat,
        lon: tile.lon,
        resolution: tile.resolution,
        data: encoded
    };
});

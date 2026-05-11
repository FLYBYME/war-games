import { defineTool } from '../../core/tool_builder.js';
import { mapGetLOSGeodeticContract } from '../../../sdk_v2/contracts/index.js';

export const map_get_los_geodetic = defineTool(mapGetLOSGeodeticContract, async (input, ctx) => {
    const { from, to, numSamples = 10 } = input;
    
    for (let i = 1; i < numSamples; i++) {
        const t = i / numSamples;
        const sampleAlt = from.alt + (to.alt - from.alt) * t;
        const sampleLat = from.lat + (to.lat - from.lat) * t;
        const sampleLon = from.lon + (to.lon - from.lon) * t;
        
        const terrainHeight = await ctx.app.terrainService.getElevation(sampleLat, sampleLon);
        
        if (sampleAlt < terrainHeight - 0.1) {
            return { 
                blocked: true, 
                obstructionLla: { lat: sampleLat, lon: sampleLon, alt: terrainHeight } 
            };
        }
    }
    
    return { blocked: false };
});

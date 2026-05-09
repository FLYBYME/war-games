import { defineTool } from '../../core/tool_builder.js';
import { mapListRegionsContract } from '../../../sdk_v2/contracts/index.js';

export const map_list_regions = defineTool(mapListRegionsContract, async (input, ctx) => {
    return {
        regions: [
            {
                id: 'scs',
                name: 'South China Sea',
                bounds: {
                    minLat: 10,
                    maxLat: 25,
                    minLon: 110,
                    maxLon: 125
                }
            },
            {
                id: 'ee',
                name: 'Eastern Europe',
                bounds: {
                    minLat: 45,
                    maxLat: 55,
                    minLon: 25,
                    maxLon: 40
                }
            },
            {
                id: 'pg',
                name: 'Persian Gulf',
                bounds: {
                    minLat: 23,
                    maxLat: 31,
                    minLon: 47,
                    maxLon: 57
                }
            }
        ]
    };
});


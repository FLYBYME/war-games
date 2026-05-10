import { defineTool } from '../../core/tool_builder.js';
import { mapListRegionsContract } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { mapRegions as mapRegionsTable } from '../../db/schema.js';

export const map_list_regions = defineTool(mapListRegionsContract, async (input, ctx) => {
    const records = db.select().from(mapRegionsTable).all();
    
    return {
        regions: records.map(r => ({
            id: r.id,
            name: r.name,
            bounds: {
                minLat: r.minLat,
                maxLat: r.maxLat,
                minLon: r.minLon,
                maxLon: r.maxLon
            }
        }))
    };
});


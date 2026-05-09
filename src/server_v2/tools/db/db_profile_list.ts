import { defineTool } from '../../core/tool_builder.js';
import { dbProfileListContract, EntityProfileSchema } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { profiles } from '../../db/schema.js';

export const db_profile_list = defineTool(dbProfileListContract, async (_input, _ctx) => {
    const results = db.select().from(profiles).all();
    
    return {
        profiles: results.map((r) => {
            const profileData = EntityProfileSchema.parse(r.data);
            return {
                id: r.id,
                name: r.name,
                description: r.description ?? undefined,
                type: profileData.type ?? 'unknown',
                tags: [] 
            };
        }),
        totalCount: results.length
    };
});

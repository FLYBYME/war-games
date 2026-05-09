import { defineTool } from '../../core/tool_builder.js';
import { dbProfileListContract } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { profiles } from '../../db/schema.js';

export const db_profile_list = defineTool(dbProfileListContract, async (input, ctx) => {
    const results = db.select().from(profiles).all();
    
    return {
        profiles: results.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description ?? undefined,
            type: (r.data as any).type ?? 'unknown', // Cast needed because schema data is stored as JSON
            tags: (r.data as any).tags ?? []
        })),
        totalCount: results.length
    };
});

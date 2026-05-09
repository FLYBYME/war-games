import { defineTool } from '../../core/tool_builder.js';
import { dbProfileGetContract, EntityProfileSchema } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { profiles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export const db_profile_get = defineTool(dbProfileGetContract, async (input, _ctx) => {
    const result = db.select().from(profiles).where(eq(profiles.id, input.id)).get();
    
    if (!result) {
        throw new Error(`Profile not found: ${input.id}`);
    }
    
    return EntityProfileSchema.parse(result.data);
});

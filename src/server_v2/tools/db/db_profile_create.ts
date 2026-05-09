import { defineTool } from '../../core/tool_builder.js';
import { dbProfileCreateContract, EntityProfileSchema } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { profiles } from '../../db/schema.js';

export const db_profile_create = defineTool(dbProfileCreateContract, async (input, _ctx) => {
    // Validate profile data
    const validatedProfile = EntityProfileSchema.parse(input.profile);
    
    db.insert(profiles).values({
        id: input.id,
        name: validatedProfile.platformClass || input.id,
        description: `User-defined profile: ${input.id}`,
        data: validatedProfile,
        createdAt: new Date(),
        updatedAt: new Date()
    }).onConflictDoUpdate({
        target: profiles.id,
        set: {
            data: validatedProfile,
            updatedAt: new Date()
        }
    }).run();
    
    return {
        id: input.id,
        success: true
    };
});

import { defineTool } from '../../core/tool_builder.js';
import { dbWeaponGetContract, WeaponProfileSchema } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { weapons } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export const db_weapon_get = defineTool(dbWeaponGetContract, async (input, _ctx) => {
    const result = db.select().from(weapons).where(eq(weapons.id, input.id)).get();
    
    if (!result) {
        throw new Error(`Weapon not found: ${input.id}`);
    }
    
    return WeaponProfileSchema.parse(result.data);
});

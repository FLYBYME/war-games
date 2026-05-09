import { defineTool } from '../../core/tool_builder.js';
import { dbWeaponListContract, WeaponProfileSchema } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { weapons } from '../../db/schema.js';

export const db_weapon_list = defineTool(dbWeaponListContract, async (_input, _ctx) => {
    const results = db.select().from(weapons).all();
    
    return {
        weapons: results.map((r) => {
            const weaponData = WeaponProfileSchema.parse(r.data);
            return {
                id: r.id,
                name: r.name,
                type: weaponData.type,
                maxRangeM: weaponData.maxRangeM
            };
        }),
        totalCount: results.length
    };
});

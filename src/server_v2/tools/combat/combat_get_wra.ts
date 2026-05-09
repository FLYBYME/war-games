import { defineTool } from '../../core/tool_builder.js';
import { combatGetWRAContract } from '../../../sdk_v2/contracts/index.js';
import { DoctrineComponent } from '../../../engine/components/Doctrine.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const combat_get_wra = defineTool(combatGetWRAContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const doctrine = entity.getComponent(DoctrineComponent);

    return {
        rules: (doctrine?.wraRules || []).map(r => ({
            targetType: r.targetType,
            weaponType: r.weaponType,
            quantity: r.quantity,
            minRangeM: r.minRangeM,
            maxRangePct: r.maxRangePct
        }))
    };
});

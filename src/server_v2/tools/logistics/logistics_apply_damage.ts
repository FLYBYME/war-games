import { defineTool } from '../../core/tool_builder.js';
import { logisticsApplyDamageContract } from '../../../sdk_v2/contracts/index.js';
import { ApplyDamageCommand } from '../../../engine/core/Command.js';
import { HealthComponent } from '../../../engine/components/Health.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const logistics_apply_damage = defineTool(logisticsApplyDamageContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    handle.world.queueExternalCommand(new ApplyDamageCommand(input.entityId, input.damage));

    const health = entity.getComponent(HealthComponent);

    return {
        entityId: entity.id,
        newHp: Math.max(0, (health?.hp || 0) - input.damage),
        isDestroyed: (health?.hp || 0) <= input.damage
    };
});

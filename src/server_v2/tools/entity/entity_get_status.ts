import { defineTool } from '../../core/tool_builder.js';
import { entityGetStatusContract } from '../../../sdk_v2/contracts/index.js';
import { HealthComponent } from '../../../engine/components/Health.js';
import { FuelComponent } from '../../../engine/components/Propulsion.js';
import { LogisticsComponent } from '../../../engine/components/Logistics.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const entity_get_status = defineTool(entityGetStatusContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const health = entity.getComponent(HealthComponent);
    const fuel = entity.getComponent(FuelComponent);
    const logistics = entity.getComponent(LogisticsComponent);

    return {
        id: entity.id,
        isAlive: !health?.isDestroyed,
        hp: health?.hp || 0,
        maxHp: health?.maxHp || 0,
        fuelPct: fuel ? (fuel.currentKg / fuel.maxKg) : 1,
        isBingo: fuel?.isBingo || false,
        logisticsState: logistics?.state || 'InFlight'
    };
});

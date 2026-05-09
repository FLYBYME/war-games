import { defineTool } from '../../core/tool_builder.js';
import { logisticsUpdateStateContract } from '../../../sdk_v2/contracts/index.js';
import { FuelComponent } from '../../../engine/components/Propulsion.js';
import { HealthComponent } from '../../../engine/components/Health.js';
import { LogisticsComponent } from '../../../engine/components/Logistics.js';
import { CombatComponent } from '../../../engine/components/Combat.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const logistics_update_state = defineTool(logisticsUpdateStateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const fuel = entity.getComponent(FuelComponent);
    const health = entity.getComponent(HealthComponent);
    const logistics = entity.getComponent(LogisticsComponent);
    const combat = entity.getComponent(CombatComponent);

    // Administrative update (Direct component mutation for Tool implementation)
    if (input.fuelKg !== undefined && fuel) fuel.currentKg = input.fuelKg;
    if (input.hp !== undefined && health) health.hp = input.hp;

    return {
        entityId: entity.id,
        fuelCurrentKg: fuel?.currentKg || 0,
        fuelMaxKg: fuel?.maxKg || 0,
        fuelPct: fuel ? (fuel.currentKg / fuel.maxKg) : 1,
        isBingo: fuel?.isBingo || false,
        burnRateKgHr: fuel?.burnRateKgHr || 0,
        hp: health?.hp || 0,
        maxHp: health?.maxHp || 0,
        logisticsState: logistics?.state || 'InFlight',
        subsystems: (health?.subsystems || []).map(s => ({
            id: s.id,
            name: s.name,
            hp: s.hp,
            maxHp: s.maxHp,
            isOperational: s.isFunctional
        })),
        magazines: (combat?.magazines || []).map(m => ({
            name: m.name,
            weaponType: m.weaponProfileId,
            remaining: m.currentCount,
            capacity: m.capacity
        }))
    };
});

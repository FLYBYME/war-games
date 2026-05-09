import { defineTool } from '../../core/tool_builder.js';
import { combatGetContract } from '../../../sdk_v2/contracts/index.js';
import { CombatComponent } from '../../../engine/components/Combat.js';
import { DoctrineComponent } from '../../../engine/components/Doctrine.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const combat_get = defineTool(combatGetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const combat = entity.getComponent(CombatComponent);
    const doctrine = entity.getComponent(DoctrineComponent);

    return {
        entityId: entity.id,
        mounts: (combat?.mounts || []).map((m, i) => {
            const mag = combat!.magazines[m.activeMagazineIndex];
            return {
                index: i,
                name: m.name,
                weaponType: mag?.weaponProfileId || 'Unknown',
                roundsRemaining: mag?.currentCount || 0,
                currentAzimuth: m.currentAzimuth,
                currentElevation: m.currentElevation,
                isReloading: (handle.world.currentTick - m.lastFireTick) < m.reloadTicks,
                reloadTicksRemaining: Math.max(0, m.reloadTicks - (handle.world.currentTick - m.lastFireTick))
            };
        }),
        targetId: combat?.currentTargetId,
        roe: doctrine?.roe || 'Tight',
        wraRules: (doctrine?.wraRules || []).map(r => ({
            targetType: r.targetType,
            weaponType: r.weaponType,
            quantity: r.quantity,
            minRangeM: r.minRangeM,
            maxRangePct: r.maxRangePct
        }))
    };
});

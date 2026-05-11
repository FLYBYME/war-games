import { defineTool } from '../../core/tool_builder.js';
import { entityCreateContract } from '../../../sdk_v2/contracts/index.js';
import { EntityManager } from '../../../engine/core/EntityManager.js';
import { TransformComponent, KinematicsComponent } from '../../../engine/components/Physics.js';
import { HealthComponent } from '../../../engine/components/Health.js';
import { FuelComponent } from '../../../engine/components/Propulsion.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const entity_create = defineTool(entityCreateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entityMgr = new EntityManager(handle.world, handle.world.profileRegistry);
    
    const entity = entityMgr.spawn({
        id: input.id,
        profileId: input.profileId,
        side: input.side,
        position: input.position,
        heading: input.heading,
        speedKts: input.speedKts
    });

    const transform = entity.getComponent(TransformComponent);
    const health = entity.getComponent(HealthComponent);
    const fuel = entity.getComponent(FuelComponent);

    return {
        id: entity.id,
        side: entity.side,
        profileId: entity.profileId,
        position: transform?.position || { x: 0, y: 0, z: 0 },
        heading: transform?.heading || 0,
        speedKts: input.speedKts || 0,
        hp: health?.hp || 0,
        isDestroyed: false,
        fuelPct: fuel ? (fuel.currentKg / fuel.maxKg) : 1
    };
});

import { defineTool } from '../../core/tool_builder.js';
import { entityGetContract } from '../../../sdk_v2/contracts/index.js';
import { TransformComponent, KinematicsComponent } from '../../../engine/components/Physics.js';
import { HealthComponent } from '../../../engine/components/Health.js';
import { FuelComponent } from '../../../engine/components/Propulsion.js';
import { MissionComponent } from '../../../engine/components/Missions.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const entity_get = defineTool(entityGetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const transform = entity.getComponent(TransformComponent);
    const kinematics = entity.getComponent(KinematicsComponent);
    const health = entity.getComponent(HealthComponent);
    const fuel = entity.getComponent(FuelComponent);
    const mission = entity.getComponent(MissionComponent);

    return {
        id: entity.id,
        side: entity.side,
        profileId: entity.profileId,
        position: transform?.position || { x: 0, y: 0, z: 0 },
        heading: transform?.heading || 0,
        speedKts: kinematics ? (Math.sqrt(kinematics.velocity.x**2 + kinematics.velocity.y**2 + kinematics.velocity.z**2) / 0.514444) : 0,
        hp: health?.hp || 0,
        isDestroyed: health?.isDestroyed || false,
        fuelPct: fuel ? (fuel.currentKg / fuel.maxKg) : 1,
        mission: mission ? {
            type: mission.missionType,
            status: mission.status,
            params: mission.params
        } : undefined

    };
});

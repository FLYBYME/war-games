import { defineTool } from '../../core/tool_builder.js';
import { entityListContract } from '../../../sdk_v2/contracts/index.js';
import { TransformComponent, KinematicsComponent } from '../../../engine/components/Physics.js';
import { HealthComponent } from '../../../engine/components/Health.js';
import { FuelComponent } from '../../../engine/components/Propulsion.js';
import { MissionComponent } from '../../../engine/components/Missions.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const entity_list = defineTool(entityListContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entities = Array.from(handle.world.getEntities());
    
    // Apply filters
    const filtered = entities.filter(e => {
        if (input.side && e.side !== input.side) return false;
        // In a real implementation, we'd check platform category from the profile or a dedicated component
        return true;
    });

    return {
        entities: filtered.map(e => {
            const transform = e.getComponent(TransformComponent);
            const kinematics = e.getComponent(KinematicsComponent);
            const health = e.getComponent(HealthComponent);
            const fuel = e.getComponent(FuelComponent);
            const mission = e.getComponent(MissionComponent);

            return {
                id: e.id,
                side: e.side,
                profileId: e.profileId,
                position: transform?.position || { x: 0, y: 0, z: 0 },
                heading: transform?.heading || 0,
                speedKts: kinematics ? (Math.sqrt(kinematics.velocity.x**2 + kinematics.velocity.y**2 + kinematics.velocity.z**2) / 0.514444) : 0,
                hp: health?.hp || 0,
                isDestroyed: health?.isDestroyed || false,
                fuelPct: fuel ? (fuel.currentKg / fuel.maxKg) : 1,
                mission: mission ? {
                    type: mission.missionType,
                    status: mission.status
                } : undefined
            };
        }),
        totalCount: filtered.length
    };
});

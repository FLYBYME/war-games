import { defineTool } from '../../core/tool_builder.js';
import { kinematicsGetContract } from '../../../sdk_v2/contracts/index.js';
import { TransformComponent, KinematicsComponent } from '../../../engine/components/Physics.js';
import { EnvironmentSystem } from '../../../engine/systems/EnvironmentSystem.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const kinematics_get = defineTool(kinematicsGetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const transform = entity.getComponent(TransformComponent);
    const kinematics = entity.getComponent(KinematicsComponent);
    const envSystem = handle.world.getSystem(EnvironmentSystem);

    if (!transform) throw new Error(`Entity ${input.entityId} has no TransformComponent`);

    const result: any = {
        position: transform.position,
        heading: transform.heading,
        pitch: transform.pitch,
        velocity: kinematics?.velocity || { x: 0, y: 0, z: 0 },
        acceleration: kinematics?.acceleration || { x: 0, y: 0, z: 0 }
    };

    // Add LLA if projection is available
    if (envSystem) {
        result.lla = envSystem.getProjection().project(transform.position);
    }

    return result;
});

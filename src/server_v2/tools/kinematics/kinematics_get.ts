import { defineTool } from '../../core/tool_builder.js';
import { kinematicsGetContract, KinematicsState } from '../../../sdk_v2/contracts/index.js';
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

    return {
        position: transform.position,
        velocity: kinematics?.velocity || { x: 0, y: 0, z: 0 },
        acceleration: kinematics?.acceleration || { x: 0, y: 0, z: 0 },
        heading: transform.heading,
        pitch: transform.pitch,
        roll: transform.roll,
        speedKts: kinematics ? (Math.sqrt(kinematics.velocity.x**2 + kinematics.velocity.y**2 + kinematics.velocity.z**2) / 0.514444) : 0,
        altitudeM: transform.position.z,
        massKg: kinematics?.massKg || 1000
    };
    });


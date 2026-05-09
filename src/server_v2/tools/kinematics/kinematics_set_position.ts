import { defineTool } from '../../core/tool_builder.js';
import { kinematicsSetPositionContract } from '../../../sdk_v2/contracts/index.js';
import { SetPositionCommand } from '../../../engine/core/Command.js';
import { TransformComponent, KinematicsComponent } from '../../../engine/components/Physics.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const kinematics_set_position = defineTool(kinematicsSetPositionContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    handle.world.queueExternalCommand(new SetPositionCommand(
        input.entityId, 
        input.position.x, 
        input.position.y, 
        input.position.z
    ));

    const transform = entity.getComponent(TransformComponent) as TransformComponent;
    const kinematics = entity.getComponent(KinematicsComponent) as KinematicsComponent;

    return {
        entityId: entity.id,
        position: transform?.position || { x: 0, y: 0, z: 0 },
        velocity: kinematics?.velocity || { x: 0, y: 0, z: 0 },
        acceleration: kinematics?.acceleration || { x: 0, y: 0, z: 0 },
        heading: transform?.heading || 0,
        pitch: transform?.pitch || 0,
        roll: transform?.roll || 0,
        altitudeM: transform?.position.z || 0,
        speedKts: kinematics ? (Math.sqrt(kinematics.velocity.x**2 + kinematics.velocity.y**2 + kinematics.velocity.z**2) / 0.514444) : 0,
        massKg: kinematics?.massKg || 1000
    };
});


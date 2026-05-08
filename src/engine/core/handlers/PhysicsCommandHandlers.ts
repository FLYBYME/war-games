import { CommandHandler } from '../CommandDispatcher.js';
import { World } from '../World.js';
import { 
    SetPositionCommand, 
    SetHeadingCommand, 
    SetAltitudeCommand, 
    SetSpeedCommand, 
    UpdateKinematicsCommand,
    UpdateThrustCommand,
    SetThrottleCommand,
    ApplyForceCommand,
    SetPitchCommand 
} from '../Command.js';
import { TransformComponent, KinematicsComponent } from '../../components/Physics.js';
import { NavigationComponent, NavState } from '../../components/Navigation.js';
import { PropulsionComponent } from '../../components/Propulsion.js';
import { TaskGraphComponent } from '../../components/TaskGraph.js';
import { MissionComponent, MissionType, MissionStatus } from '../../components/Missions.js';
import { TaskStatus, TaskGraphManager } from '../TaskGraph.js';
 
export class SetPositionHandler implements CommandHandler<SetPositionCommand> {
    execute(cmd: SetPositionCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const transform = entity?.getComponent(TransformComponent);
        if (transform) {
            transform.position.x = cmd.x;
            transform.position.y = cmd.y;
            transform.position.z = cmd.z;
            
            world.grid.updateEntity(cmd.entityId, transform.position);
        }
    }
}
 
export class SetHeadingHandler implements CommandHandler<SetHeadingCommand> {
    execute(cmd: SetHeadingCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (!entity) return;

        const navigation = entity.getComponent(NavigationComponent);
        const transform = entity.getComponent(TransformComponent);
        const taskComp = entity.getComponent(TaskGraphComponent);
        const missionComp = entity.getComponent(MissionComponent);

        if (navigation) {
            navigation.desiredHeadingDeg = cmd.heading;
            if (cmd.isExternal) navigation.navState = NavState.None; // Manual override
        } else if (transform) {
            transform.rotation = cmd.heading;
        }

        // Suspend automated tasks only on external override
        if (cmd.isExternal && taskComp) {
            for (const node of taskComp.graph.nodes.values()) {
                if (node.status === TaskStatus.Active || node.status === TaskStatus.Pending) {
                    node.status = TaskStatus.Suspended;
                }
            }
            TaskGraphManager.updateActiveNodes(taskComp.graph);
        }

        // Abort high-level mission only on external override
        if (cmd.isExternal && missionComp) {
            missionComp.missionType = MissionType.Idle;
            missionComp.status = MissionStatus.Aborted;
        }
    }
}
 
export class SetPitchHandler implements CommandHandler<SetPitchCommand> {
    execute(cmd: SetPitchCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const transform = entity?.getComponent(TransformComponent);
        if (transform) transform.pitch = cmd.pitch;
    }
}
 
export class SetAltitudeHandler implements CommandHandler<SetAltitudeCommand> {
    execute(cmd: SetAltitudeCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (!entity) return;
 
        const navigation = entity.getComponent(NavigationComponent);
        const taskComp = entity.getComponent(TaskGraphComponent);
        const missionComp = entity.getComponent(MissionComponent);
        if (!navigation) return;
 
        // Validation: Ships cannot fly!
        const profile = entity.profileId ? world.profileRegistry.get(entity.profileId) : undefined;
        if (profile?.type === 'Ship' && cmd.altitudeM !== 0) {
            navigation.desiredAltitudeM = 0;
            return;
        }
 
        // Validation: Subs cannot fly!
        if (profile?.type === 'Submarine' && cmd.altitudeM > 0) {
            navigation.desiredAltitudeM = Math.min(0, cmd.altitudeM);
            return;
        }
 
        navigation.desiredAltitudeM = cmd.altitudeM;
        if (cmd.isExternal) navigation.navState = NavState.None; // Manual override

        // Suspend automated tasks only on external override
        if (cmd.isExternal && taskComp) {
            for (const node of taskComp.graph.nodes.values()) {
                if (node.status === TaskStatus.Active || node.status === TaskStatus.Pending) {
                    node.status = TaskStatus.Suspended;
                }
            }
            TaskGraphManager.updateActiveNodes(taskComp.graph);
        }

        // Abort mission only on external override
        if (cmd.isExternal && missionComp) {
            missionComp.missionType = MissionType.Idle;
            missionComp.status = MissionStatus.Aborted;
        }
    }
}
 
export class SetSpeedHandler implements CommandHandler<SetSpeedCommand> {
    execute(cmd: SetSpeedCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (!entity) return;
 
        const navigation = entity.getComponent(NavigationComponent);
        const taskComp = entity.getComponent(TaskGraphComponent);
        const missionComp = entity.getComponent(MissionComponent);
        if (!navigation) return;
 
        const profile = entity.profileId ? world.profileRegistry.get(entity.profileId) : undefined;
        let speed = cmd.speedKts;
 
        // Validation: Clamp to profile max speed
        if (profile?.kinematics?.maxSpeedKts) {
            speed = Math.min(speed, profile.kinematics.maxSpeedKts);
        } else if (profile?.type === 'Ship') {
            speed = Math.min(speed, 40); // Default ship max
        }
 
        navigation.desiredSpeedKts = speed;
        if (cmd.isExternal) navigation.navState = NavState.None; // Manual override

        // Suspend automated tasks only on external override
        if (cmd.isExternal && taskComp) {
            for (const node of taskComp.graph.nodes.values()) {
                if (node.status === TaskStatus.Active || node.status === TaskStatus.Pending) {
                    node.status = TaskStatus.Suspended;
                }
            }
            TaskGraphManager.updateActiveNodes(taskComp.graph);
        }

        // Abort mission only on external override
        if (cmd.isExternal && missionComp) {
            missionComp.missionType = MissionType.Idle;
            missionComp.status = MissionStatus.Aborted;
        }
    }
}

export class UpdateKinematicsHandler implements CommandHandler<UpdateKinematicsCommand> {
    execute(cmd: UpdateKinematicsCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const kinematics = entity?.getComponent(KinematicsComponent);
        if (kinematics) {
            kinematics.velocity = cmd.velocity;
            kinematics.acceleration = cmd.acceleration;
        }
    }
}

export class SetThrottleHandler implements CommandHandler<SetThrottleCommand> {
    execute(cmd: SetThrottleCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const prop = entity?.getComponent(PropulsionComponent);
        if (prop) {
            prop.throttle = Math.max(0, Math.min(1.0, cmd.throttle));
        }
    }
}

export class UpdateThrustHandler implements CommandHandler<UpdateThrustCommand> {
    execute(cmd: UpdateThrustCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const kinematics = entity?.getComponent(KinematicsComponent);
        const prop = entity?.getComponent(PropulsionComponent);
        if (kinematics) kinematics.thrustN = cmd.thrustN;
        if (prop) prop.currentThrustN = cmd.thrustN;
    }
}

export class ApplyForceHandler implements CommandHandler<ApplyForceCommand> {
    execute(cmd: ApplyForceCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const kinematics = entity?.getComponent(KinematicsComponent);
        if (kinematics) {
            kinematics.netForce.x += cmd.forceX;
            kinematics.netForce.y += cmd.forceY;
            kinematics.netForce.z += cmd.forceZ;
        }
    }
}

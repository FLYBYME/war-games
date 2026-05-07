import { Entity } from '../../core/Entity.js';
import { TaskNode, InterceptPayload, TaskResult } from '../../core/TaskGraph.js';
import { IWorldView } from '../../core/ISystem.js';
import { Command, SetHeadingCommand, SetSpeedCommand, SetAltitudeCommand } from '../../core/Command.js';
import { TaskWorker } from '../TaskReconcilerSystem.js';
import { TransformComponent, KinematicsComponent } from '../../components/Physics.js';
import { TrackComponent } from '../../components/Track.js';
import { VectorMath } from '../../math/VectorMath.js';
import { Physics } from '../../PhysicsConstants.js';
import { TaskGraphComponent } from '../../components/TaskGraph.js';
import { logger } from '../../core/Logger.js';
import { Vector3 } from '../../core/Types.js';

/**
 * InterceptWorker: Dynamic intercept and station-keeping.
 */
export class InterceptWorker implements TaskWorker {
    public reconcile(entity: Entity, taskNode: TaskNode<InterceptPayload, TaskResult>, world: IWorldView, _dt: number): Command[] {
        const payload = taskNode.task.payload;
        const transform = entity.getComponent(TransformComponent);
        const taskComp = entity.getComponent(TaskGraphComponent);

        if (!transform || !taskComp) return [];

        // 1. Resolve Target
        const target = this.resolveTarget(entity, payload.targetId, world);
        if (!target) {
            taskComp.graph.markFailed(taskNode.id, `Target ${payload.targetId} lost`);
            return [];
        }

        const dist = VectorMath.distance(transform.position, target.pos);
        const closeRange = payload.closeRangeM || 50;

        const commands: Command[] = [];

        if (dist < closeRange) {
            // 2. Station Keeping Mode
            // Match target heading and speed
            const targetHdg = (Math.atan2(target.vel.y, target.vel.x) * Physics.RAD_TO_DEG + 360) % 360; 
            const velHdg = targetHdg;
            const targetSpeedKts = VectorMath.magnitude(target.vel) * Physics.MPS_TO_KTS;

            commands.push(new SetHeadingCommand(entity.id, velHdg));
            commands.push(new SetSpeedCommand(entity.id, targetSpeedKts));
            commands.push(new SetAltitudeCommand(entity.id, target.pos.z + 10)); // Hover 10m above target

            // In station-keeping, we consider Intercept "Complete" but the worker keeps running until dropped
            // or the next task (Boarding) starts.
            const currentSpeed = VectorMath.magnitude(entity.getComponent(KinematicsComponent)?.velocity || {x:0,y:0,z:0}) * Physics.MPS_TO_KTS;
            if (Math.abs(currentSpeed - targetSpeedKts) < 5.0) {
                taskComp.graph.markCompleted(taskNode.id, { stationKeeping: true });
                logger.info(`Intercept completed: ${entity.id} now station-keeping with ${payload.targetId}`, { dist: Math.round(dist) });
            }
        } else {
            // 3. Intercept Mode (Lead Pursuit)
            const myPos = transform.position;
            const mySpeedMPS = payload.speedKts * Physics.KTS_TO_MPS;
            
            // Simple Lead: Time to intercept = dist / closure_rate
            // For now, simple pursuit towards predicted position
            const timeToIntercept = dist / Math.max(10, mySpeedMPS);
            const predictedPos = VectorMath.add(target.pos, VectorMath.multiplyScalar(target.vel, timeToIntercept));
            
            const vToTarget = VectorMath.subtract(predictedPos, myPos);
            const desiredHeading = (Math.atan2(vToTarget.y, vToTarget.x) * Physics.RAD_TO_DEG + 360) % 360;
            
            commands.push(new SetHeadingCommand(entity.id, desiredHeading));
            commands.push(new SetSpeedCommand(entity.id, payload.speedKts));
            commands.push(new SetAltitudeCommand(entity.id, target.pos.z + 50)); // Approach at 50m above
        }

        return commands;
    }

    private resolveTarget(observer: Entity, targetId: string, world: IWorldView): { pos: Vector3, vel: Vector3 } | undefined {
        if (targetId.startsWith('TRK-')) {
            const trackComp = observer.getComponent(TrackComponent);
            const track = trackComp?.tracks.get(targetId);
            if (track) return { pos: { ...track.position }, vel: { ...track.velocity } };
        } else {
            const ent = world.getEntity(targetId);
            if (ent) {
                const t = ent.getComponent(TransformComponent);
                const k = ent.getComponent(KinematicsComponent);
                if (t && k) return { pos: { ...t.position }, vel: { ...k.velocity } };
            }
        }
        return undefined;
    }
}

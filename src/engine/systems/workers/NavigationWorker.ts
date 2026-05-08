import { Entity } from '../../core/Entity.js';
import { TaskNode, NavigatePayload, TaskResult, TaskGraphManager } from '../../core/TaskGraph.js';
import { IWorldView } from '../../core/ISystem.js';
import { Command, SetHeadingCommand, SetSpeedCommand, SetAltitudeCommand } from '../../core/Command.js';
import { TaskWorker } from '../TaskReconcilerSystem.js';
import { TransformComponent } from '../../components/Physics.js';
import { VectorMath } from '../../math/VectorMath.js';
import { Physics } from '../../PhysicsConstants.js';
import { TaskGraphComponent } from '../../components/TaskGraph.js';

/**
 * NavigationWorker: Reconciles a 'Navigate' task into heading, speed, and altitude commands.
 */
export class NavigationWorker implements TaskWorker {
    public reconcile(entity: Entity, taskNode: TaskNode<NavigatePayload, TaskResult>, world: IWorldView, _dt: number): Command[] {
        const payload = taskNode.task.payload;
        const transform = entity.getComponent(TransformComponent);
        const taskComp = entity.getComponent(TaskGraphComponent);

        if (!transform || !taskComp || !payload.position || payload.speedKts === undefined) return [];

        const dist = VectorMath.distance(transform.position, payload.position);
        const tolerance = payload.toleranceM || 500;

        // 1. Check Arrival
        if (dist < tolerance) {
            TaskGraphManager.markCompleted(taskComp.graph, taskNode.id, { arrivalTick: world.currentTick });
            return [new SetSpeedCommand(entity.id, 0)];
        }

        // 2. Generate Commands
        const commands: Command[] = [];

        // Steer towards target
        const vToTarget = VectorMath.subtract(payload.position, transform.position);
        const desiredHeading = (Math.atan2(vToTarget.y, vToTarget.x) * Physics.RAD_TO_DEG + 360) % 360;
        commands.push(new SetHeadingCommand(entity.id, desiredHeading));

        // Altitude
        const targetAlt = payload.altitudeM !== undefined ? payload.altitudeM : payload.position.z;
        commands.push(new SetAltitudeCommand(entity.id, targetAlt));

        // 3. Match Speed
        let targetSpeedKts = payload.speedKts;

        if (payload.timeOverTargetTick && payload.timeOverTargetTick > world.currentTick) {
            const remainingTicks = payload.timeOverTargetTick - world.currentTick;
            const requiredSpeedMPS = dist / (remainingTicks * 0.1);
            targetSpeedKts = requiredSpeedMPS * Physics.MPS_TO_KTS;
            
            // Safety: Cap speed
            targetSpeedKts = Math.min(1500, targetSpeedKts);
        }

        commands.push(new SetSpeedCommand(entity.id, targetSpeedKts));

        return commands;
    }
}

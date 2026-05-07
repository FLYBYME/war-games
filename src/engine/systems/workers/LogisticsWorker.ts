import { Entity } from '../../core/Entity.js';
import { TaskNode, LogisticsPayload, TaskResult } from '../../core/TaskGraph.js';
import { IWorldView } from '../../core/ISystem.js';
import { Command, LandAtFacilityCommand } from '../../core/Command.js';
import { TaskWorker } from '../TaskReconcilerSystem.js';
import { TransformComponent } from '../../components/Physics.js';
import { VectorMath } from '../../math/VectorMath.js';
import { LogisticsComponent, TurnaroundState } from '../../components/Logistics.js';

/**
 * LogisticsWorker: Handles automated landing and takeoff tasks.
 */
export class LogisticsWorker implements TaskWorker {
    public reconcile(entity: Entity, taskNode: TaskNode<LogisticsPayload, TaskResult>, world: IWorldView, _dt: number): Command[] {
        const payload = taskNode.task.payload;
        const transform = entity.getComponent(TransformComponent);
        const logistics = entity.getComponent(LogisticsComponent);

        if (!transform || !logistics) return [];

        const commands: Command[] = [];

        if (payload.type === 'Land') {
            const facility = world.getEntity(payload.facilityId);
            const facilityPos = facility?.getComponent(TransformComponent)?.position;

            if (facilityPos) {
                const dist = VectorMath.distance(transform.position, facilityPos);
                // If we are close enough, trigger the Land command
                if (dist < 500 && Math.abs(transform.position.z - facilityPos.z) < 50) {
                    commands.push(new LandAtFacilityCommand(entity.id, payload.facilityId));
                    // We don't mark completed here; the command handler will update state
                    // and then the graph can be updated if needed. 
                    // Actually, let's mark it completed so the graph moves on.
                    if (logistics.state !== TurnaroundState.InFlight) {
                        // world.taskGraph.markCompleted(taskNode.id); 
                        // Wait, TaskReconciler handles marking completed if worker says so.
                        // For now, let's just emit the command.
                    }
                }
            }
        }

        return commands;
    }
}

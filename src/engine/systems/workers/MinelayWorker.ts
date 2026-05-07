import { Entity } from '../../core/Entity.js';
import { IWorldView } from '../../core/ISystem.js';
import { Command, SpawnEntityCommand } from '../../core/Command.js';
import { TaskWorker } from '../TaskReconcilerSystem.js';
import { TransformComponent } from '../../components/Physics.js';
import { VectorMath } from '../../math/VectorMath.js';
import { TaskNode, MinelayPayload, TaskResult } from '../../core/TaskGraph.js';
import { TaskGraphComponent } from '../../components/TaskGraph.js';
import { Vector3 } from '../../core/Types.js';

/**
 * MinelayWorker: Periodically spawns mines behind the entity.
 */
export class MinelayWorker implements TaskWorker {
    private lastDropPos?: Vector3;
    private droppedCount = 0;

    public reconcile(entity: Entity, taskNode: TaskNode<MinelayPayload, TaskResult>, _world: IWorldView, _dt: number): Command[] {
        const payload = taskNode.task.payload;
        const transform = entity.getComponent(TransformComponent);
        const taskComp = entity.getComponent(TaskGraphComponent);

        if (!transform || !taskComp) return [];

        if (this.droppedCount >= payload.quantity) {
            taskComp.graph.markCompleted(taskNode.id, { dropped: this.droppedCount });
            return [];
        }

        const commands: Command[] = [];
        const currentPos = transform.position;

        if (!this.lastDropPos || VectorMath.distance(this.lastDropPos, currentPos) >= payload.spacingM) {
            // Drop a mine!
            const mineId = `mine-${entity.id}-${this.droppedCount}`;
            
            commands.push(new SpawnEntityCommand(
                mineId,
                payload.mineProfileId,
                entity.side,
                { x: currentPos.x, y: currentPos.y, z: -10 }, // Submerged
                0
            ));

            this.lastDropPos = { ...currentPos };
            this.droppedCount++;
        }

        return commands;
    }
}

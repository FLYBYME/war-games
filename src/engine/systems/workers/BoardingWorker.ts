import { Entity } from '../../core/Entity.js';
import { TaskNode, TaskStatus, BoardingPayload, TaskResult } from '../../core/TaskGraph.js';
import { IWorldView } from '../../core/ISystem.js';
import { Command } from '../../core/Command.js';
import { TaskWorker } from '../TaskReconcilerSystem.js';
import { BoardingComponent } from '../../components/Boarding.js';
import { Area } from '../../core/Types.js';

/**
 * BoardingWorker: Reconciles a 'Boarding' task by attaching a BoardingComponent.
 */
export class BoardingWorker implements TaskWorker {
    public reconcile(entity: Entity, taskNode: TaskNode<BoardingPayload, TaskResult>, _world: IWorldView, _dt: number): Command[] {
        const payload = taskNode.task.payload;

        let boarding = entity.getComponent(BoardingComponent);
        if (!boarding) {
            boarding = new BoardingComponent(payload.targetId, payload.durationTicks, payload.durationTicks, undefined, payload.allowedArea);
            entity.addComponent(boarding);

            // Emit Event
            _world.events.emit({
                type: 'BoardingStarted',
                tick: _world.currentTick,
                entityId: entity.id,
                targetId: payload.targetId,
                data: { durationTicks: payload.durationTicks }
            });
        }

        // The task remains "Active" in the TaskGraph until marked "Completed" by the BoardingSystem.
        return [];
    }
}

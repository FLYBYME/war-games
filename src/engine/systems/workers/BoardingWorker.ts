import { Entity } from '../../core/Entity.js';
import { TaskNode, BoardingPayload, TaskResult } from '../../core/TaskGraph.js';
import { Command } from '../../core/Command.js';
import { TaskWorker } from '../TaskReconcilerSystem.js';

/**
 * BoardingWorker: Simplified reconciler for boarding tasks.
 * Most logic is in BoardingSystem.
 */
export class BoardingWorker implements TaskWorker {
    public reconcile(_entity: Entity, _taskNode: TaskNode<BoardingPayload, TaskResult>): Command[] {
        return [];
    }
}

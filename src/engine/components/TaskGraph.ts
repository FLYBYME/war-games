import { IComponent } from '../core/Types.js';
import { TaskGraph, TaskGraphManager } from '../core/TaskGraph.js';

/**
 * TaskGraphComponent: Stores the current execution DAG for an entity.
 */
export class TaskGraphComponent implements IComponent {
    readonly type = 'TaskGraphComponent';
    public graph: TaskGraph = TaskGraphManager.create();

    constructor() {}
}

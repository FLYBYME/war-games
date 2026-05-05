import { IComponent } from '../core/Types.js';
import { TaskGraph } from '../core/TaskGraph.js';

/**
 * TaskGraphComponent: Stores the current execution DAG for an entity.
 */
export class TaskGraphComponent implements IComponent {
    readonly type = 'TaskGraphComponent';

    constructor(
        public graph: TaskGraph = new TaskGraph()
    ) {}
}

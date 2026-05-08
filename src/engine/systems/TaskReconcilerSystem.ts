import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { TaskGraphComponent } from '../components/TaskGraph.js';
import { TaskGraphManager, TaskType, TaskStatus, TaskNode, TaskPayload, TaskResult } from '../core/TaskGraph.js';
import { Entity } from '../core/Entity.js';
import { NavigationWorker } from './workers/NavigationWorker.js';
import { InterceptWorker } from './workers/InterceptWorker.js';
import { BoardingWorker } from './workers/BoardingWorker.js';
import { MinelayWorker } from './workers/MinelayWorker.js';
import { LogisticsWorker } from './workers/LogisticsWorker.js';

/**
 * TaskWorker: Interface for specific task logic.
 */
export interface TaskWorker {
    reconcile(entity: Entity, task: TaskNode<TaskPayload, TaskResult>, world: IWorldView, dt: number): Command[];
}

/**
 * TaskReconcilerSystem: The "Politburo".
 * Orchestrates the execution of the Task DAG.
 */
export class TaskReconcilerSystem implements ISystem {
    readonly name = 'TaskReconcilerSystem';
    readonly phase = SystemPhase.Decision;
    readonly dependencies = ['MissionSystem'];

    private workers: Map<TaskType, TaskWorker> = new Map();

    constructor() {
        // Register default workers
        this.workers.set(TaskType.Navigate, new NavigationWorker());
        this.workers.set(TaskType.Intercept, new InterceptWorker());
        this.workers.set(TaskType.Boarding, new BoardingWorker());
        this.workers.set(TaskType.Minelay, new MinelayWorker());
        this.workers.set(TaskType.Logistics, new LogisticsWorker());
        // this.workers.set(TaskType.Engage, new CombatWorker());
    }

    public registerWorker(type: TaskType, worker: TaskWorker): void {
        this.workers.set(type, worker);
    }

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const taskComp = entity.getComponent(TaskGraphComponent);
            if (!taskComp) continue;

            const activeTasks = TaskGraphManager.getActiveTasks(taskComp.graph);

            for (const taskNode of activeTasks) {
                const worker = this.workers.get(taskNode.task.type);
                if (worker) {
                    taskNode.status = TaskStatus.Active;
                    const taskCommands = worker.reconcile(entity, taskNode, world, dt);
                    commands.push(...taskCommands);
                } else {
                    console.warn(`No worker found for task type: ${taskNode.task.type}`);
                    TaskGraphManager.markFailed(taskComp.graph, taskNode.id, `No worker for type ${taskNode.task.type}`);
                }
            }
        }

        return commands;
    }
}

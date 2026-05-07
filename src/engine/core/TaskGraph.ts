import { Vector3, AreaV3 } from './Types.js';
import { PatrolParams } from '../components/Missions.js';

export enum TaskType {
    None = 'None',
    Navigate = 'Navigate',
    Engage = 'Engage',
    Patrol = 'Patrol',
    Evasion = 'Evasion',
    Logistics = 'Logistics',
    Intercept = 'Intercept',
    Boarding = 'Boarding',
    Minelay = 'Minelay',
    MCMSweep = 'MCMSweep'
}

export enum TaskStatus {
    Pending = 'Pending',
    Active = 'Active',
    Completed = 'Completed',
    Failed = 'Failed',
    Suspended = 'Suspended'
}

export interface NavigatePayload {
    position?: Vector3;
    speedKts?: number;
    altitudeM?: number;
    toleranceM?: number;
    timeOverTargetTick?: number;
    leaderId?: string; // For formation keeping
    offset?: Vector3;
    mode?: 'Independent' | 'Formation';
}

export interface InterceptPayload {
    targetId: string;
    speedKts: number;
    closeRangeM?: number;
}

export interface BoardingPayload {
    targetId: string;
    durationTicks: number;
    allowedArea?: AreaV3;
}

export interface MinelayPayload {
    mineProfileId: string;
    quantity: number;
    spacingM: number;
}

export interface LogisticsPayload {
    type: 'Land' | 'Takeoff';
    facilityId: string;
}

export type TaskPayload = 
    | NavigatePayload 
    | InterceptPayload 
    | BoardingPayload 
    | MinelayPayload 
    | LogisticsPayload
    | PatrolParams;

export interface TaskResult {
    arrivalTick?: number;
    stationKeeping?: boolean;
    dropped?: number;
    success?: boolean;
    failureReason?: string;
}

/**
 * Task: A declarative intent with a payload.
 */
export interface Task<T extends TaskPayload = TaskPayload> {
    type: TaskType;
    payload: T;
}

/**
 * TaskNode: A node in the Directed Acyclic Graph (DAG).
 */
export interface TaskNode<T extends TaskPayload = TaskPayload, R = TaskResult> {
    id: string;
    task: Task<T>;
    dependencies: string[]; // IDs of parent tasks
    status: TaskStatus;
    result?: R;
}

export function isNavigateTask(node: TaskNode<TaskPayload, TaskResult>): node is TaskNode<NavigatePayload, TaskResult> {
    return node.task.type === TaskType.Navigate;
}

/**
 * TaskGraph: A collection of tasks with dependency management.
 */
export class TaskGraph {
    constructor(
        public nodes: Map<string, TaskNode> = new Map(),
        public activeNodeIds: Set<string> = new Set()
    ) { }

    public addNode(node: TaskNode): void {
        this.nodes.set(node.id, node);
        this.updateActiveNodes();
    }

    /**
     * updateActiveNodes: Identifies nodes whose dependencies are satisfied.
     */
    public updateActiveNodes(): void {
        this.activeNodeIds.clear();
        for (const node of this.nodes.values()) {
            if (node.status === TaskStatus.Pending) {
                const depsSatisfied = node.dependencies.every(depId => {
                    const depNode = this.nodes.get(depId);
                    return depNode && depNode.status === TaskStatus.Completed;
                });

                if (depsSatisfied) {
                    this.activeNodeIds.add(node.id);
                }
            }
        }
    }

    public markCompleted(id: string, result?: TaskResult): void {
        const node = this.nodes.get(id);
        if (node) {
            node.status = TaskStatus.Completed;
            node.result = result;
            this.updateActiveNodes();
        }
    }

    public markFailed(id: string, reason: string): void {
        const node = this.nodes.get(id);
        if (node) {
            node.status = TaskStatus.Failed;
            node.result = { failureReason: reason };
            // In a DAG, failure might invalidate child nodes
            this.invalidateChildren(id);
        }
    }

    private invalidateChildren(id: string): void {
        for (const node of this.nodes.values()) {
            if (node.dependencies.includes(id)) {
                node.status = TaskStatus.Failed;
                node.result = { failureReason: `Dependency ${id} failed` };
                this.invalidateChildren(node.id);
            }
        }
    }

    public getActiveTasks(): TaskNode[] {
        return Array.from(this.activeNodeIds).map(id => this.nodes.get(id)!);
    }
}

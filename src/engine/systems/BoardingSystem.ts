import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, UpdateLogisticsStateCommand } from '../core/Command.js';
import { LogisticsComponent, TurnaroundState } from '../components/Logistics.js';
import { TaskGraphComponent } from '../components/TaskGraph.js';
import { TaskType, TaskStatus } from '../core/TaskGraph.js';
import { VectorMath } from '../math/VectorMath.js';
import { TransformComponent } from '../components/Physics.js';
import { logger } from '../core/Logger.js';

/**
 * BoardingSystem: Level 3 Task Processor for Boarding operations (VBSS).
 * Periodically checks proximity and transitions task state.
 */
export class BoardingSystem implements ISystem {
    readonly name = 'BoardingSystem';
    readonly phase = SystemPhase.Decision;
    readonly dependencies = ['TaskReconcilerSystem'];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const taskComp = entity.getComponent(TaskGraphComponent);
            const transform = entity.getComponent(TransformComponent);
            if (!taskComp || !transform) continue;

            const boardingTasks = taskComp.graph.getActiveTasks().filter(t => t.task.type === TaskType.Boarding);

            for (const node of boardingTasks) {
                const payload = node.task.payload as { targetId: string, durationTicks: number };
                const target = world.getEntity(payload.targetId);

                if (!target) {
                    taskComp.graph.markFailed(node.id, 'Target lost');
                    continue;
                }

                const targetTransform = target.getComponent(TransformComponent);
                if (targetTransform) {
                    const dist = VectorMath.distance(transform.position, targetTransform.position);
                    
                    if (node.status === TaskStatus.Pending && dist < 100) {
                        // Start boarding
                        node.status = TaskStatus.Active;
                        logger.info(`Boarding started: ${entity.id} -> ${target.id}`);
                        
                        // Tell logistics we're busy
                        const log = entity.getComponent(LogisticsComponent);
                        if (log) {
                            commands.push(new UpdateLogisticsStateCommand(entity.id, TurnaroundState.Boarding, payload.durationTicks));
                        }

                        world.recordEvent({
                            tick: world.currentTick,
                            type: 'BoardingStarted',
                            entityId: entity.id,
                            targetId: target.id
                        });
                    }

                    if (node.status === TaskStatus.Active) {
                        // Check completion
                        const log = entity.getComponent(LogisticsComponent);
                        if (log && log.state !== TurnaroundState.Boarding) {
                            taskComp.graph.markCompleted(node.id, { success: true });
                            logger.info(`Boarding completed: ${entity.id} -> ${target.id}`);
                            
                            world.recordEvent({
                                tick: world.currentTick,
                                type: 'BoardingCompleted',
                                entityId: entity.id,
                                targetId: target.id
                            });
                        }
                    }
                }
            }
        }

        return commands;
    }
}

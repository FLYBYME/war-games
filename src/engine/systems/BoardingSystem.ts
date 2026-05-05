import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, ChangeSideCommand } from '../core/Command.js';
import { BoardingComponent, BoardingStatus } from '../components/Boarding.js';
import { MissionComponent, MissionStatus } from '../components/Missions.js';
import { TaskGraphComponent } from '../components/TaskGraph.js';
import { TaskType, TaskStatus } from '../core/TaskGraph.js';
import { VectorMath } from '../math/VectorMath.js';
import { TransformComponent } from '../components/Physics.js';
import { logger } from '../core/Logger.js';

/**
 * BoardingSystem: Processes the active boarding phase of a VBSS mission.
 */
export class BoardingSystem implements ISystem {
    readonly name = 'BoardingSystem';
    readonly phase = SystemPhase.Lifecycle;
    readonly dependencies = ['TaskReconcilerSystem'];

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const boarding = entity.getComponent(BoardingComponent);
            if (!boarding || boarding.status !== BoardingStatus.InProgress) continue;

            const target = world.getEntity(boarding.targetId);
            if (!target) {
                boarding.status = BoardingStatus.Failed;
                continue;
            }

            // 1. Proximity Check (Must stay close during boarding)
            const myPos = entity.getComponent(TransformComponent)?.position;
            const targetPos = target.getComponent(TransformComponent)?.position;
            if (myPos && targetPos) {
                const dist = VectorMath.distance(myPos, targetPos);
                if (dist > 200) { // Lost boarding position
                    boarding.status = BoardingStatus.Failed;
                    continue;
                }
            }

            // 1.5 Area Check (Polygon Constraint)
            if (boarding.allowedArea && targetPos) {
                const polyPoints = boarding.allowedArea.points.map(p => ({ x: (p as any).x, y: (p as any).y }));
                const isInside = VectorMath.isPointInPolygon({ x: targetPos.x, y: targetPos.y }, polyPoints);
                if (!isInside) {
                    boarding.status = BoardingStatus.Failed;
                    logger.warn(`Boarding failed: Target ${boarding.targetId} moved out of valid VBSS area`, { entityId: entity.id });
                    continue;
                }
            }

            // 2. Progress Timer
            boarding.remainingTicks -= 1;

            if (boarding.remainingTicks <= 0) {
                boarding.status = BoardingStatus.Completed;
                boarding.remainingTicks = 0;

                // 3. SEIZURE: Change target side to match boarder
                commands.push(new ChangeSideCommand(target.id, entity.side));

                // 4. Update Task Graph
                const taskComp = entity.getComponent(TaskGraphComponent);
                if (taskComp) {
                    const activeBoardingTask = taskComp.graph.getActiveTasks().find(t => t.task.type === TaskType.Boarding);
                    if (activeBoardingTask) {
                        taskComp.graph.markCompleted(activeBoardingTask.id, { success: true });
                    }
                }

                // 5. Update Mission Status
                const mission = entity.getComponent(MissionComponent);
                if (mission) {
                    mission.status = MissionStatus.Completed;
                }
            }
        }

        return commands;
    }
}

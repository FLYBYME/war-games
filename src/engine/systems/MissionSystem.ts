import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { MissionType } from '../core/Types.js';
import { MissionComponent, MissionStatus, isMission } from '../components/Missions.js';
import { DesiredState } from './ministries/IMinistry.js';
import { TaskType, TaskStatus, isNavigateTask, TaskGraphManager } from '../core/TaskGraph.js';
import { MinistryOfPatrol } from './ministries/MinistryOfPatrol.js';
import { MinistryOfStrike } from './ministries/MinistryOfStrike.js';
import { MinistryOfVBSS, VBSSDesiredState } from './ministries/MinistryOfVBSS.js';
import { MinistryOfMinelaying } from './ministries/MinistryOfMinelaying.js';
import { MinistryOfMCM } from './ministries/MinistryOfMCM.js';
import { TaskGraphComponent } from '../components/TaskGraph.js';
import { Entity } from '../core/Entity.js';

/**
 * MissionSystem: The Operational Layer (Level 2).
 * Delegates mission evaluation to specialized Ministries via static dispatch.
 */
export class MissionSystem implements ISystem {
    readonly name = 'MissionSystem';
    readonly phase = SystemPhase.Decision;
    readonly dependencies = [];

    private patrolMinistry = new MinistryOfPatrol();
    private strikeMinistry = new MinistryOfStrike();
    private vbssMinistry = new MinistryOfVBSS();
    private minelayingMinistry = new MinistryOfMinelaying();
    private mcmMinistry = new MinistryOfMCM();

    public evaluateMinistry(entity: Entity, mission: MissionComponent<any>, world: IWorldView): DesiredState {
        let desired: DesiredState | undefined;
        switch (mission.missionType) {
            case MissionType.Patrol:
                desired = this.patrolMinistry.evaluate(entity, mission, world);
                break;
            case MissionType.Strike:
                desired = this.strikeMinistry.evaluate(entity, mission, world);
                break;
            case MissionType.VBSS:
                desired = this.vbssMinistry.evaluate(entity, mission, world);
                break;
            case MissionType.Minelaying:
                desired = this.minelayingMinistry.evaluate(entity, mission, world);
                break;
            case MissionType.MCM:
                desired = this.mcmMinistry.evaluate(entity, mission, world);
                break;
        }
        return desired || { objectiveId: 'Idle' };
    }

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const mission = entity.getComponent(MissionComponent);
            if (!mission || mission.missionType === MissionType.Idle) continue;

            let desired: DesiredState | undefined;

            // Static dispatch
            switch (mission.missionType) {
                case MissionType.Patrol:
                    if (isMission(mission, MissionType.Patrol)) {
                        desired = this.patrolMinistry.evaluate(entity, mission, world);
                    }
                    break;
                case MissionType.Strike:
                    if (isMission(mission, MissionType.Strike)) {
                        desired = this.strikeMinistry.evaluate(entity, mission, world);
                    }
                    break;
                case MissionType.VBSS:
                    if (isMission(mission, MissionType.VBSS)) {
                        const vbssDesired = this.vbssMinistry.evaluate(entity, mission, world);
                        desired = vbssDesired;
                        
                        const taskComp = entity.getComponent(TaskGraphComponent);
                        if (taskComp) {
                            this.reconcileVBSS(taskComp, vbssDesired);
                        }
                    }
                    break;
                case MissionType.Minelaying:
                    if (isMission(mission, MissionType.Minelaying)) {
                        desired = this.minelayingMinistry.evaluate(entity, mission, world);
                        
                        const taskComp = entity.getComponent(TaskGraphComponent);
                        if (taskComp) {
                            this.reconcileMinelaying(taskComp, mission);
                        }
                    }
                    break;
                case MissionType.MCM:
                    if (isMission(mission, MissionType.MCM)) {
                        desired = this.mcmMinistry.evaluate(entity, mission, world);
                    }
                    break;
            }

            if (!desired) continue;

            if (mission.status === MissionStatus.Pending) {
                mission.status = MissionStatus.Active;
            }

            const taskComp = entity.getComponent(TaskGraphComponent);
            if (taskComp && desired.targetPosition) {
                const activeTasks = TaskGraphManager.getActiveTasks(taskComp.graph);
                const navTask = activeTasks.find(isNavigateTask);

                if (!navTask) {
                    let timeOverTargetTick: number | undefined;
                    if (isMission(mission, MissionType.Strike)) {
                        timeOverTargetTick = mission.params.timeOverTargetTick;
                    }

                    TaskGraphManager.addNode(taskComp.graph, {
                        id: desired.objectiveId,
                        task: {
                            type: TaskType.Navigate,
                            payload: {
                                position: desired.targetPosition,
                                speedKts: 450,
                                timeOverTargetTick
                            }
                        },
                        dependencies: [],
                        status: TaskStatus.Pending
                    });
                } else {
                    navTask.task.payload.position = desired.targetPosition;
                    if (isMission(mission, MissionType.Strike)) {
                        navTask.task.payload.timeOverTargetTick = mission.params.timeOverTargetTick;
                    }
                }
            }
        }

        return commands;
    }

    private reconcileMinelaying(taskComp: TaskGraphComponent, mission: MissionComponent<MissionType.Minelaying>): void {
        const params = mission.params;
        const taskId = `minelay-${mission.startTimeTick}`;

        if (!taskComp.graph.nodes.has(taskId)) {
            TaskGraphManager.addNode(taskComp.graph, {
                id: taskId,
                task: {
                    type: TaskType.Minelay,
                    payload: {
                        mineProfileId: params.mineProfileId,
                        quantity: params.quantity,
                        spacingM: params.spacingM
                    }
                },
                dependencies: [],
                status: TaskStatus.Pending
            });
        }
    }

    private reconcileVBSS(taskComp: TaskGraphComponent, desired: VBSSDesiredState): void {
        const interceptId = `${desired.objectiveId}-intercept`;
        const boardingId = `${desired.objectiveId}-boarding`;

        if (!taskComp.graph.nodes.has(interceptId)) {
            TaskGraphManager.addNode(taskComp.graph, {
                id: interceptId,
                task: {
                    type: TaskType.Intercept,
                    payload: { targetId: desired.targetId, speedKts: 60 }
                },
                dependencies: [],
                status: TaskStatus.Pending
            });
        }

        if (!taskComp.graph.nodes.has(boardingId)) {
            TaskGraphManager.addNode(taskComp.graph, {
                id: boardingId,
                task: {
                    type: TaskType.Boarding,
                    payload: {
                        targetId: desired.targetId,
                        durationTicks: desired.boardingDurationTicks,
                        allowedArea: desired.allowedArea
                    }
                },
                dependencies: [interceptId],
                status: TaskStatus.Pending
            });
        }
    }

    public getResults() {
        return []; // Placeholder if needed
    }
}

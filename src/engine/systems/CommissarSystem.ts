import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { GroupComponent, GroupFormation } from '../components/Group.js';
import { TaskGraphComponent } from '../components/TaskGraph.js';
import { TaskType, TaskStatus } from '../core/TaskGraph.js';
import { MissionComponent, MissionType, MissionStatus } from '../components/Missions.js';
import { Side } from '../core/Types.js';

/**
 * CommissarSystem: Tactical Group AI.
 * Translates Group-level mission objectives into individual Entity TaskGraphs.
 * Handles formation-keeping and local deconfliction.
 */
export class CommissarSystem implements ISystem {
    readonly name = 'CommissarSystem';
    readonly phase = SystemPhase.Decision;
    readonly dependencies = ['MissionSystem'];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const group = entity.getComponent(GroupComponent);
            const mission = entity.getComponent(MissionComponent);

            // Only Leaders process group logic
            if (!group || group.leaderId !== entity.id) continue;
            if (!mission || mission.status !== MissionStatus.Active) continue;

            this.reconcileGroup(world, entity.id, group, mission);
        }

        return commands;
    }

    private reconcileGroup(world: IWorldView, leaderId: string, group: GroupComponent, mission: MissionComponent): void {
        switch (mission.missionType) {
            case MissionType.Patrol:
                this.managePatrol(world, leaderId, group, mission);
                break;
            // Strike, ASW, etc.
        }
    }

    private managePatrol(world: IWorldView, leaderId: string, group: GroupComponent, mission: MissionComponent): void {
        // 1. Ensure Leader has a Patrol Task in their DAG
        const leader = world.getEntity(leaderId);
        const leaderTasks = leader?.getComponent(TaskGraphComponent);
        if (leaderTasks && leaderTasks.graph.nodes.size === 0) {
            // Generate Patrol DAG for leader
            const patrolParams = mission.params;
            if (!('center' in patrolParams)) {
                return; // Not a valid patrol
            }

            leaderTasks.graph.addNode({
                id: `patrol-${leaderId}-${world.currentTick}`,
                task: { type: TaskType.Patrol, payload: patrolParams },
                dependencies: [],
                status: TaskStatus.Pending
            });
        }

        // 2. Ensure Followers are in Formation
        let index = 1;
        for (const memberId of group.memberIds) {
            if (memberId === leaderId) continue;
            const member = world.getEntity(memberId);
            const memberTasks = member?.getComponent(TaskGraphComponent);

            if (memberTasks && memberTasks.graph.nodes.size === 0) {
                // Calculate Offset based on formation
                const offset = this.calculateFormationOffset(group.formation, index, group.spacingM);
                
                memberTasks.graph.addNode({
                    id: `stay-in-form-${memberId}`,
                    task: { 
                        type: TaskType.Navigate, 
                        payload: { 
                            leaderId: leaderId, 
                            offset, 
                            mode: 'Formation' 
                        } 
                    },
                    dependencies: [],
                    status: TaskStatus.Pending
                });
                index++;
            }
        }
    }

    private calculateFormationOffset(type: GroupFormation, index: number, spacing: number) {
        switch (type) {
            case GroupFormation.LineAbreast:
                return { x: index % 2 === 0 ? (index / 2) * spacing : -(Math.ceil(index / 2)) * spacing, y: 0, z: 0 };
            case GroupFormation.Column:
                return { x: 0, y: -index * spacing, z: 0 };
            default:
                return { x: 0, y: 0, z: 0 };
        }
    }
}

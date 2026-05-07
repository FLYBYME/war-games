import { IWorldView } from '../../core/ISystem.js';
import { MissionComponent } from '../../components/Missions.js';
import { MissionType } from '../../core/Types.js';
import { Entity } from '../../core/Entity.js';
import { DesiredState } from './IMinistry.js';
import { TransformComponent } from '../../components/Physics.js';

export interface StrikeParams {
    targetId: string;
    speedKts?: number;
    timeOverTargetTick?: number;
}

/**
 * MinistryOfStrike: Specialized AI logic for Strike missions.
 */
export class MinistryOfStrike {
    public evaluate(entity: Entity, mission: MissionComponent<MissionType.Strike>, world: IWorldView): DesiredState | undefined {
        const params = mission.params as StrikeParams;

        // 1. Target Validation
        const target = world.getEntity(params.targetId);
        if (!target) {
            return undefined;
        }

        const targetTransform = target.getComponent(TransformComponent);
        const targetPos = targetTransform ? { ...targetTransform.position } : undefined;

        // 2. Strike Execution
        return {
            objectiveId: `strike-${target.id}`,
            targetPosition: targetPos
        };
    }
}

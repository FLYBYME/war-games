import { IWorldView } from '../../core/ISystem.js';
import { MissionComponent, MissionType } from '../../components/Missions.js';
import { Entity } from '../../core/Entity.js';
import { Vector3 } from '../../core/Types.js';

/**
 * DesiredState: A declaration of what the world should look like for a mission.
 * The Reconcilers use this to generate DAGs.
 */
export interface DesiredState {
    objectiveId: string;
    targetPosition?: Vector3;
    doctrineUpdates?: Record<string, string | number | boolean | undefined>;
    resourceNeeds?: Record<string, number>;
}

/**
 * IMinistry: Interface for Operational Mission Controllers.
 */
export interface IMinistry<T extends MissionType> {
    readonly type: string;
    evaluate(entity: Entity, mission: MissionComponent<T>, world: IWorldView): DesiredState;
}

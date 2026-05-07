import { Entity } from '../../core/Entity.js';
import { MissionComponent, MissionType } from '../../components/Missions.js';
import { IWorldView } from '../../core/ISystem.js';
import { IMinistry, DesiredState } from './IMinistry.js';

/**
 * MinistryOfMinelaying: Orchestrates the deployment of a minefield.
 */
export class MinistryOfMinelaying implements IMinistry<MissionType.Minelaying> {
    readonly type = 'Minelaying';

    public evaluate(_entity: Entity, mission: MissionComponent<MissionType.Minelaying>, _world: IWorldView): DesiredState {
        const params = mission.params;

        // Minelaying is simplified: navigate to the center of the area and start dropping.
        // In a real scenario, this would generate a search/lay pattern.
        const center = params.area.points[0];

        return {
            objectiveId: `minelay-${center.x}-${center.y}`,
            targetPosition: { ...center },
            doctrineUpdates: { mode: 'Minelaying' }
        };
    }
}

import { Entity } from '../../core/Entity.js';
import { MissionComponent, MissionType } from '../../components/Missions.js';
import { IWorldView } from '../../core/ISystem.js';
import { IMinistry, DesiredState } from './IMinistry.js';

/**
 * MinistryOfMCM: Orchestrates minesweeping or mine hunting.
 */
export class MinistryOfMCM implements IMinistry<MissionType.MCM> {
    readonly type = 'MCM';

    public evaluate(_entity: Entity, mission: MissionComponent<MissionType.MCM>, _world: IWorldView): DesiredState {
        const params = mission.params;

        // MCM search pattern: navigate to area
        const center = params.area.points[0];

        if (!center) {
            throw new Error('Invalid MCM mission: No center point provided');
        }

        return {
            objectiveId: `mcm-${center.x}-${center.y}`,
            targetPosition: { ...center },
            doctrineUpdates: {
                mode: 'MCM',
                method: params.method,
                // If sweeping, turn on signatures/jammers
                emcon: params.method === 'Sweep' ? 'Charlie' : 'Alpha'
            }
        };
    }
}

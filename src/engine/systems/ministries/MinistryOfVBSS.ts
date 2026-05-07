import { Entity } from '../../core/Entity.js';
import { MissionComponent, MissionType } from '../../components/Missions.js';
import { IWorldView } from '../../core/ISystem.js';
import { IMinistry, DesiredState } from './IMinistry.js';
import { TransformComponent } from '../../components/Physics.js';
import { TrackComponent } from '../../components/Track.js';
import { AreaV3, Vector3 } from '../../core/Types.js';

export interface VBSSDesiredState extends DesiredState {
    targetId: string;
    boardingDurationTicks: number;
    allowedArea?: AreaV3;
}

export class MinistryOfVBSS implements IMinistry<MissionType.VBSS> {
    readonly type = 'VBSS';

    public evaluate(entity: Entity, mission: MissionComponent<MissionType.VBSS>, world: IWorldView): VBSSDesiredState {
        const params = mission.params;
        
        // 1. Resolve Target Position
        let targetPos: Vector3 | undefined;
        if (params.targetId.startsWith('TRK-')) {
            targetPos = this.findTrackPosition(entity, params.targetId);
        } else {
            const target = world.getEntity(params.targetId);
            const transform = target?.getComponent(TransformComponent);
            if (transform) {
                targetPos = { ...transform.position };
            }
        }

        return {
            objectiveId: `vbss-${params.targetId}`,
            targetPosition: targetPos,
            targetId: params.targetId,
            boardingDurationTicks: params.boardingDurationTicks,
            allowedArea: params.allowedArea
        };
    }

    private findTrackPosition(observer: Entity, trackId: string): Vector3 | undefined {
        const trackComp = observer.getComponent(TrackComponent);
        const track = trackComp?.tracks.get(trackId);
        if (track) {
            return { ...track.position };
        }
        return undefined;
    }
}

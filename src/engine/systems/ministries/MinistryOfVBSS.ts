import { Entity } from '../../core/Entity.js';
import { MissionComponent, MissionType, VBSSParams } from '../../components/Missions.js';
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
        const targetPos = params.targetId.startsWith('TRK-') 
            ? this.findTrackPosition(entity, params.targetId)
            : world.getEntity(params.targetId)?.getComponent(TransformComponent)?.position;

        return {
            objectiveId: `vbss-${params.targetId}`,
            targetPosition: targetPos as Vector3,
            targetId: params.targetId,
            boardingDurationTicks: params.boardingDurationTicks,
            allowedArea: params.allowedArea
        };
    }

    private findTrackPosition(observer: Entity, trackId: string): Vector3 | undefined {
        const trackComp = observer.getComponent(TrackComponent);
        const track = trackComp?.tracks.get(trackId);
        return track?.position as Vector3;
    }
}

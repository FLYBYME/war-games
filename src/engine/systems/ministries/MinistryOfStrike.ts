import { Entity } from '../../core/Entity.js';
import { MissionComponent, MissionType, StrikeParams } from '../../components/Missions.js';
import { IWorldView } from '../../core/ISystem.js';
import { IMinistry, DesiredState } from './IMinistry.js';
import { TransformComponent } from '../../components/Physics.js';
import { TrackComponent } from '../../components/Track.js';
import { Vector3 } from '../../core/Types.js';

export class MinistryOfStrike implements IMinistry<MissionType.Strike> {
    readonly type = 'Strike';

    public evaluate(entity: Entity, mission: MissionComponent<MissionType.Strike>, world: IWorldView): DesiredState {
        const params = mission.params;
        
        // 1. Resolve Target Position
        let targetPos = params.targetId.startsWith('TRK-') 
            ? this.findTrackPosition(entity, params.targetId)
            : world.getEntity(params.targetId)?.getComponent(TransformComponent)?.position;

        if (targetPos) {
            targetPos = { ...targetPos };
            const profile = world.profileRegistry.get(entity.profileId);
            if (profile?.type === 'Aircraft' || profile?.type === 'Weapon') {
                // If targeting a surface unit, maintain a strike altitude (e.g. 100m)
                // instead of diving into the water.
                if (targetPos.z < 100) {
                    targetPos.z = 100;
                }
            }
        }

        return {
            objectiveId: `strike-${params.targetId}`,
            targetPosition: targetPos as Vector3,
            doctrineUpdates: { 
                speedKts: params.speedKts,
                timeOverTargetTick: params.timeOverTargetTick,
                mode: 'Strike'
            }
        };
    }

    private findTrackPosition(observer: Entity, trackId: string): Vector3 | undefined {
        const trackComp = observer.getComponent(TrackComponent);
        const track = trackComp?.tracks.get(trackId);
        return track?.position as Vector3;
    }
}

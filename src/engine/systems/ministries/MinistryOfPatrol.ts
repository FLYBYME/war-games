import { IMinistry, DesiredState } from './IMinistry.js';
import { Entity } from '../../core/Entity.js';
import { MissionComponent, MissionType, PatrolParams } from '../../components/Missions.js';
import { IWorldView } from '../../core/ISystem.js';
import { Vector3, IdentificationStatus } from '../../core/Types.js';
import { TrackComponent } from '../../components/Track.js';
import { VectorMath } from '../../math/VectorMath.js';

export class MinistryOfPatrol implements IMinistry<MissionType.Patrol> {
    readonly type = 'Patrol';

    public evaluate(entity: Entity, mission: MissionComponent<MissionType.Patrol>, world: IWorldView): DesiredState {
        const params = mission.params;
        const tracks = entity.getComponent(TrackComponent);
        
        // 1. Tactical Awareness: Are there hostiles in my patrol zone?
        let interceptTarget: Vector3 | undefined = undefined;
        let targetId: string | undefined = undefined;

        if (tracks) {
            let nearestDist = Infinity;
            for (const track of tracks.tracks.values()) {
                if (track.identification === IdentificationStatus.HOSTILE) {
                    const distToCenter = VectorMath.distance(track.position as Vector3, params.center);
                    if (distToCenter <= params.radiusM) {
                        const distToMe = VectorMath.distance(track.position as Vector3, (entity as any).getComponent('TransformComponent')?.position || params.center);
                        if (distToMe < nearestDist) {
                            nearestDist = distToMe;
                            interceptTarget = track.position as Vector3;
                            targetId = track.trueEntityId;
                        }
                    }
                }
            }
        }

        // 2. Navigation: If intercepting, go to hostile. Otherwise, loiter.
        let targetPos: Vector3;
        let objectiveId: string;

        if (interceptTarget) {
            targetPos = { ...interceptTarget };
            objectiveId = `patrol-intercept-${targetId}`;
        } else {
            // Calculate a point on an orbit around the center
            // Orbit speed depends on tick
            const orbitRadius = params.radiusM * 0.7; // Patrol at 70% of radius
            const angle = (world.currentTick * 0.01) % (Math.PI * 2);
            targetPos = {
                x: params.center.x + Math.cos(angle) * orbitRadius,
                y: params.center.y + Math.sin(angle) * orbitRadius,
                z: params.center.z
            };
            objectiveId = `patrol-loiter-${params.center.x}-${params.center.y}`;
        }

        return {
            objectiveId,
            targetPosition: targetPos,
            doctrineUpdates: { 
                emcon: 'Active',
                roe: 'Free',
                speedKts: params.speedKts || 350,
                currentTargetId: targetId
            }
        };
    }
}

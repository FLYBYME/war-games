import { IMinistry, DesiredState } from './IMinistry.js';
import { Entity } from '../../core/Entity.js';
import { MissionComponent, MissionType } from '../../components/Missions.js';
import { IWorldView } from '../../core/ISystem.js';
import { Vector3, IdentificationStatus } from '../../core/Types.js';
import { TrackComponent } from '../../components/Track.js';
import { VectorMath } from '../../math/VectorMath.js';
import { TransformComponent } from '../../components/Physics.js';

export class MinistryOfPatrol implements IMinistry<MissionType.Patrol> {
    readonly type = 'Patrol';

    public evaluate(entity: Entity, mission: MissionComponent<MissionType.Patrol>, _world: IWorldView): DesiredState {
        const params = mission.params;
        const transform = entity.getComponent(TransformComponent);
        const center = params.center || transform?.position || { x: 0, y: 0, z: 0, z0: 0 } as unknown as Vector3;
        const radiusM = params.radiusM || 5000;
        
        const tracks = entity.getComponent(TrackComponent);
        
        // 1. Tactical Awareness: Are there hostiles in my patrol zone?
        let interceptTarget: Vector3 | undefined = undefined;
        let targetId: string | undefined = undefined;

        if (tracks) {
            let nearestDist = Infinity;
            for (const track of tracks.tracks.values()) {
                if (track.identification === IdentificationStatus.HOSTILE) {
                    const distToCenter = VectorMath.distance(track.position, center);
                    if (distToCenter <= radiusM) {
                        const distToMe = VectorMath.distance(track.position, transform?.position || center);
                        if (distToMe < nearestDist) {
                            nearestDist = distToMe;
                            interceptTarget = { ...track.position };
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
            objectiveId = `patrol-intercept-${targetId || 'unknown'}`;
        } else {
            // Calculate a point on an orbit around the center
            // Orbit speed depends on tick
            const orbitRadius = radiusM * 0.7; // Patrol at 70% of radius
            const angle = (_world.currentTick * 0.01) % (Math.PI * 2);
            targetPos = {
                x: center.x + Math.cos(angle) * orbitRadius,
                y: center.y + Math.sin(angle) * orbitRadius,
                z: center.z
            };
            objectiveId = `patrol-loiter-${center.x}-${center.y}`;
        }

        return {
            objectiveId,
            targetPosition: targetPos,
            doctrineUpdates: { 
                emcon: 'Active',
                roe: 'Free',
                speedKts: (params as { speedKts?: number }).speedKts || 350,
                currentTargetId: targetId
            }
        };
    }
}

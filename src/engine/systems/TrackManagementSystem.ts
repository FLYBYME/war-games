import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { DetectionComponent } from '../components/Sensors.js';
import { TrackComponent } from '../components/TMS.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { CombatComponent } from '../components/Combat.js';
import { Track, TrackStatus, IdentificationStatus, Side } from '../core/Types.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';

/**
 * TrackManagementSystem: Processes raw detections into persistent tactical tracks.
 * Level 1 Sensor Fusion.
 */
export class TrackManagementSystem implements ISystem {
    readonly name = 'TrackManagementSystem';
    readonly phase = SystemPhase.Perception;
    readonly dependencies = ['SensorSystem'];

    // Internal metadata for tracking lifecycle
    private trackMetadata = new Map<string, { 
        detectionCount: number, 
        lastTruePosition?: { x: number, y: number, z: number },
        lastUpdateTick: number,
        isESMOnly?: boolean
    }>();

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const observer of world.getEntities()) {
            const trackComp = observer.getComponent(TrackComponent);
            const detection = observer.getComponent(DetectionComponent);
            const obsTransform = observer.getComponent(TransformComponent);
            if (!trackComp || !detection || !obsTransform) continue;

            const detectedThisTick = new Set<string>();

            // 1. Process "Hard" Detections (Radar, Sonar, Visual)
            for (const targetId of detection.detectedEntityIds) {
                const target = world.getEntity(targetId);
                if (!target) continue;

                const transform = target.getComponent(TransformComponent);
                const kinematics = target.getComponent(KinematicsComponent);
                if (!transform) continue;

                detectedThisTick.add(targetId);

                // Find existing track for this true entity
                let track = Array.from(trackComp.tracks.values()).find(t => t.trueEntityId === targetId);
                
                if (track) {
                    const meta = this.getMetadata(track.id);
                    meta.isESMOnly = false;
                    
                    // Case 56: Velocity Estimation
                    if (!kinematics && meta.lastTruePosition) {
                        const diff = VectorMath.subtract(transform.position, meta.lastTruePosition);
                        const estimatedVel = VectorMath.multiplyScalar(diff, 1 / dt);
                        track.velocity = estimatedVel;
                    } else if (kinematics) {
                        track.velocity = { ...kinematics.velocity };
                    }

                    track.position = { ...transform.position };
                    track.lastSeenTick = world.currentTick;
                    meta.lastTruePosition = { ...transform.position };
                    meta.detectionCount++;
                    meta.lastUpdateTick = world.currentTick;

                    // Promotion rule
                    if (meta.detectionCount >= 3) {
                        track.status = TrackStatus.Active;
                        track.confidence = Math.min(1.0, track.confidence + 0.2);
                    } else {
                        track.status = TrackStatus.Coasting; 
                    }

                    track.classification = this.classifyEntity(transform.position.z, target.profileId);
                    track.cepM = Math.max(10, track.cepM * 0.8); // Improve CEP on update
                } else {
                    const trackId = `TRK-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
                    const newTrack: Track = {
                        id: trackId,
                        trueEntityId: targetId,
                        position: { ...transform.position },
                        velocity: kinematics ? { ...kinematics.velocity } : { x: 0, y: 0, z: 0 },
                        lastSeenTick: world.currentTick,
                        cepM: 100, 
                        status: TrackStatus.Coasting,
                        classification: this.classifyEntity(transform.position.z, target.profileId),
                        identification: this.deriveInitialID(observer.side, target.side),
                        confidence: 0.1
                    };
                    
                    trackComp.tracks.set(newTrack.id, newTrack);
                    this.trackMetadata.set(newTrack.id, { 
                        detectionCount: 1, 
                        lastTruePosition: { ...transform.position },
                        lastUpdateTick: world.currentTick,
                        isESMOnly: false
                    });
                    track = newTrack;
                }

                // Identification Logic (Hostile Act)
                this.checkHostileAct(world, target, track);
            }

            // 2. Process ESM Bearings (Case 54)
            for (const bearing of detection.esmBearings) {
                if (!bearing.targetId) continue;
                if (detectedThisTick.has(bearing.targetId)) continue; // Already have hard track

                const target = world.getEntity(bearing.targetId);
                if (!target) continue;

                let track = Array.from(trackComp.tracks.values()).find(t => t.trueEntityId === bearing.targetId);
                const targetTransform = target.getComponent(TransformComponent);
                if (!targetTransform) continue;

                // Create or update "Bearing Track"
                if (!track) {
                    const trackId = `ESM-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
                    track = {
                        id: trackId,
                        trueEntityId: bearing.targetId,
                        position: { ...targetTransform.position }, // Hidden truth used as center of LOB
                        velocity: { x: 0, y: 0, z: 0 },
                        lastSeenTick: world.currentTick,
                        cepM: 50000, // Massive uncertainty
                        status: TrackStatus.Coasting,
                        classification: 'ESM-Strobe',
                        identification: IdentificationStatus.PENDING,
                        confidence: 0.05
                    };
                    trackComp.tracks.set(track.id, track);
                    this.trackMetadata.set(track.id, { 
                        detectionCount: 1, 
                        lastUpdateTick: world.currentTick,
                        isESMOnly: true 
                    });
                } else {
                    const meta = this.getMetadata(track.id);
                    if (meta.isESMOnly) {
                        track.lastSeenTick = world.currentTick;
                        track.position = { ...targetTransform.position };
                        track.cepM = 50000;
                    }
                }
                detectedThisTick.add(bearing.targetId);
            }

            // 3. Process Coasting & Interpolation
            for (const [id, track] of trackComp.tracks) {
                if (!detectedThisTick.has(track.trueEntityId)) {
                    track.status = TrackStatus.Coasting;

                    track.position.x += track.velocity.x * dt;
                    track.position.y += track.velocity.y * dt;
                    track.position.z += track.velocity.z * dt;

                    const velMag = VectorMath.magnitude(track.velocity);
                    track.cepM += (velMag * 0.05 + 5.0) * dt;
                    track.confidence = Math.max(0, track.confidence - 0.01 * dt);
                } else {
                    const meta = this.getMetadata(track.id);
                    if (!meta.isESMOnly && track.cepM > 100) track.cepM = 100;
                }

                if (world.currentTick - track.lastSeenTick > 200) {
                    trackComp.tracks.delete(id);
                    this.trackMetadata.delete(id);
                }
            }
        }

        return commands;
    }

    private checkHostileAct(world: IWorldView, target: any, track: Track) {
        if (track.identification === IdentificationStatus.HOSTILE) return;
        const targetCombat = target.getComponent(CombatComponent);
        if (targetCombat) {
            for (const mount of targetCombat.mounts) {
                if (world.currentTick - mount.lastFireTick < 2) {
                    track.identification = IdentificationStatus.HOSTILE;
                    break;
                }
            }
        }
    }

    private classifyEntity(alt: number, _profileId?: string): string {
        if (alt < -5) return 'Subsurface';
        if (alt < 20) return 'Surface';
        if (alt < 2000) return 'Air-Low';
        return 'Air-High';
    }

    private getMetadata(trackId: string) {
        let meta = this.trackMetadata.get(trackId);
        if (!meta) {
            meta = { detectionCount: 0, lastUpdateTick: 0 };
            this.trackMetadata.set(trackId, meta);
        }
        return meta;
    }

    private deriveInitialID(mySide: Side, targetSide: Side): IdentificationStatus {
        if (mySide === targetSide) return IdentificationStatus.FRIENDLY;
        if (targetSide === Side.Neutral) return IdentificationStatus.NEUTRAL;
        return IdentificationStatus.PENDING; 
    }
}

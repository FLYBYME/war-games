import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { DetectionComponent } from '../components/Sensors.js';
import { TrackComponent } from '../components/Track.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { Side, TrackStatus, IdentificationStatus, Track } from '../core/Types.js';
import { VectorMath } from '../math/VectorMath.js';
import { AeroComponent } from '../components/Aero.js';
import { Entity } from '../core/Entity.js';
import { AcousticSignatureComponent } from '../components/Subsurface.js';

/**
 * TrackManagementSystem: Fuses raw detections into Tracks.
 * Handles correlation, identification, and track maintenance.
 */
export class TrackManagementSystem implements ISystem {
    readonly name = 'TrackManagementSystem';
    readonly phase = SystemPhase.Perception;
    readonly dependencies = ['SensorSystem'];

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];
        const currentTick = world.currentTick;

        for (const entity of world.getEntities()) {
            const detections = entity.getComponent(DetectionComponent);
            const trackComp = entity.getComponent(TrackComponent);

            if (!detections || !trackComp) continue;

            // 1. Correlate detections to tracks
            for (const targetId of detections.detectedEntityIds) {
                const target = world.getEntity(targetId);
                if (!target) continue;

                const targetTransform = target.getComponent(TransformComponent);
                const targetKin = target.getComponent(KinematicsComponent);

                if (!targetTransform) continue;

                // Simple correlation: check if we already have a track for this entityId
                // In a more complex sim, we'd use position/velocity gating
                let track: Track | undefined;
                for (const t of trackComp.tracks.values()) {
                    if (t.trueEntityId === targetId) {
                        track = t;
                        break;
                    }
                }

                if (track) {
                    // Update existing track
                    track.position = { ...targetTransform.position };
                    track.velocity = targetKin ? { ...targetKin.velocity } : { x: 0, y: 0, z: 0 };
                    track.lastSeenTick = currentTick;
                    track.confidence = Math.min(1.0, track.confidence + 0.1);
                    track.status = TrackStatus.Active;
                } else {
                    // Create new track
                    const newTrack: Track = {
                        id: `TRK-${targetId}-${entity.id.substring(0, 4)}`,
                        trueEntityId: targetId,
                        position: { ...targetTransform.position },
                        velocity: targetKin ? { ...targetKin.velocity } : { x: 0, y: 0, z: 0 },
                        lastSeenTick: currentTick,
                        identification: this.performIdentification(entity.side, target.side),
                        confidence: 0.5,
                        status: TrackStatus.Active,
                        classification: this.inferClassification(target),
                        cepM: 0 // Ground truth for now
                    };
                    trackComp.tracks.set(newTrack.id, newTrack);
                }
            }

            // 2. Track Maintenance: Remove stale tracks
            for (const [trackId, track] of trackComp.tracks.entries()) {
                if (currentTick - track.lastSeenTick > 300) { // ~30 second timeout at 10Hz
                    track.status = TrackStatus.Dropped;
                    trackComp.tracks.delete(trackId);
                }
            }
        }

        return commands;
    }

    private inferClassification(target: Entity): string {
        if (target.hasComponent(AeroComponent)) return 'Air';
        if (target.hasComponent(AcousticSignatureComponent)) {
            const transform = target.getComponent(TransformComponent);
            if (transform && transform.position.z < -5) return 'Subsurface';
        }
        const transform = target.getComponent(TransformComponent);
        if (transform && transform.position.z > 500) return 'Air'; // Fallback for things without Aero but high up
        
        return 'Surface'; // Default
    }

    private performIdentification(mySide: Side, targetSide: Side): IdentificationStatus {
        if (mySide === targetSide) {
            return IdentificationStatus.FRIENDLY;
        }

        // Initially mark non-friendly as Unknown
        return IdentificationStatus.UNKNOWN;
    }
}

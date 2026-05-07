import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { DetectionComponent } from '../components/Sensors.js';
import { TrackComponent } from '../components/TMS.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { Track, TrackStatus, IdentificationStatus, Side } from '../core/Types.js';

/**
 * TrackManagementSystem: Processes raw detections into persistent tactical tracks.
 * Level 1 Sensor Fusion.
 */
export class TrackManagementSystem implements ISystem {
    readonly name = 'TrackManagementSystem';
    readonly phase = SystemPhase.Perception;
    readonly dependencies = ['SensorSystem'];

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const observer of world.getEntities()) {
            const trackComp = observer.getComponent(TrackComponent);
            const detection = observer.getComponent(DetectionComponent);
            if (!trackComp || !detection) continue;

            // Simple direct correlation for V3 initial release
            for (const targetId of detection.detectedEntityIds) {
                const target = world.getEntity(targetId);
                if (!target) continue;

                const transform = target.getComponent(TransformComponent);
                const kinematics = target.getComponent(KinematicsComponent);
                if (!transform) continue;

                // Update or Create
                const track = Array.from(trackComp.tracks.values()).find(t => t.trueEntityId === targetId);
                
                if (track) {
                    track.position = { ...transform.position };
                    track.velocity = kinematics ? { ...kinematics.velocity } : { x: 0, y: 0, z: 0 };
                    track.lastSeenTick = world.currentTick;
                    track.status = TrackStatus.Active;
                } else {
                    const newTrack: Track = {
                        id: `TRK-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
                        trueEntityId: targetId,
                        position: { ...transform.position },
                        velocity: kinematics ? { ...kinematics.velocity } : { x: 0, y: 0, z: 0 },
                        lastSeenTick: world.currentTick,
                        cepM: 0,
                        status: TrackStatus.Active,
                        classification: 'Unknown',
                        identification: this.deriveInitialID(observer.side, target.side),
                        confidence: 0.5
                    };
                    trackComp.tracks.set(newTrack.id, newTrack);
                }
            }

            // Cleanup stale tracks
            for (const [id, track] of trackComp.tracks) {
                if (world.currentTick - track.lastSeenTick > 100) {
                    trackComp.tracks.delete(id);
                }
            }
        }

        return commands;
    }

    private deriveInitialID(mySide: Side, targetSide: Side): IdentificationStatus {
        if (mySide === targetSide) return IdentificationStatus.FRIENDLY;
        if (targetSide === Side.Neutral) return IdentificationStatus.NEUTRAL;
        return IdentificationStatus.HOSTILE; // Aggressive default for sim
    }
}

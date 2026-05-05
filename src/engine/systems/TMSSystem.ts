import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, CreateTrackCommand, UpdateTrackCommand, DropTrackCommand } from '../core/Command.js';
import { DetectionComponent } from '../components/Sensors.js';
import { TrackComponent } from '../components/Track.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { Track, TrackStatus, Vector3, IdentificationStatus, Side } from '../core/Types.js';
import { VectorMath } from '../math/VectorMath.js';

/**
 * TMSSystem: Track Management System.
 * Manages the transition from raw sensor detections to persistent tactical tracks.
 * Implements Correlation, Dead Reckoning, and Track Lifecycle.
 */
export class TMSSystem implements ISystem {
    readonly name = 'TMSSystem';
    readonly phase = SystemPhase.Perception;
    readonly dependencies = ['SensorSystem'];

    // Configuration
    private readonly CEP_EXPANSION_RATE = 2.0;    // m/s
    private readonly CEP_MAX = 20000;             // 20km
    private readonly COAST_TIMEOUT_TICKS = 200;   // 20 seconds at 10Hz
    private readonly DROP_TIMEOUT_TICKS = 400;    // 40 seconds at 10Hz

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];
        const currentTick = world.currentTick;

        for (const observer of world.getEntities()) {
            const trackComp = observer.getComponent(TrackComponent);
            if (!trackComp) continue;

            const detectionComp = observer.getComponent(DetectionComponent);

            // 1. Dead Reckoning & Lifecycle
            for (const track of trackComp.tracks.values()) {
                // V3 Optimization: Kill ghost tracks immediately if truth is gone
                if (track.trueEntityId) {
                    const targetTruth = world.getEntity(track.trueEntityId);
                    if (!targetTruth) {
                        commands.push(new DropTrackCommand(observer.id, track.id));
                        continue;
                    }
                }

                // Propagate position
                track.position = VectorMath.add(track.position as Vector3, VectorMath.multiplyScalar(track.velocity as Vector3, dt));
                
                // Expand uncertainty
                track.cepM += this.CEP_EXPANSION_RATE * dt;

                // Status updates
                const age = currentTick - track.lastSeenTick;
                if (track.status === TrackStatus.Active && age > this.COAST_TIMEOUT_TICKS) {
                    commands.push(new UpdateTrackCommand(observer.id, track.id, { status: TrackStatus.Coasting }));
                }

                // Dropping
                if (track.cepM > this.CEP_MAX || age > this.DROP_TIMEOUT_TICKS) {
                    commands.push(new DropTrackCommand(observer.id, track.id));
                }
            }

            // 2. Correlation
            if (detectionComp) {
                for (const targetId of detectionComp.detectedEntityIds) {
                    const target = world.getEntity(targetId);
                    if (!target) continue;

                    // V3 Fix: Ignore friendly weapons during track creation/update
                    // This prevents 'Ghost Surface Tracks' for outbound missiles
                    if (target.side === observer.side) {
                        const targetProfile = target.profileId ? world.profileRegistry.get(target.profileId) : undefined;
                        if (targetProfile?.type === 'Weapon') continue;
                    }

                    const targetTransform = target.getComponent(TransformComponent);
                    const targetKinematics = target.getComponent(KinematicsComponent);
                    if (!targetTransform) continue;

                    // Try to find existing track for this true entity
                    let existingTrack: Track | undefined;
                    for (const t of trackComp.tracks.values()) {
                        if (t.trueEntityId === targetId) {
                            existingTrack = t;
                            break;
                        }
                    }

                    if (existingTrack) {
                        // Update existing track
                        const { identification, classification } = this.identifyAndClassify(observer.side, target, world);
                        commands.push(new UpdateTrackCommand(observer.id, existingTrack.id, {
                            position: { ...targetTransform.position },
                            velocity: targetKinematics ? { ...targetKinematics.velocity } : { x: 0, y: 0, z: 0 },
                            lastSeenTick: currentTick,
                            cepM: 0, // Reset uncertainty on direct detection
                            status: TrackStatus.Active,
                            identification,
                            classification
                        }));
                    } else {
                        // Create new track
                        const { identification, classification } = this.identifyAndClassify(observer.side, target, world);
                        const newTrackId = `TRK-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
                        const newTrack: Track = {
                            id: newTrackId,
                            trueEntityId: targetId,
                            position: { ...targetTransform.position },
                            velocity: targetKinematics ? { ...targetKinematics.velocity } : { x: 0, y: 0, z: 0 },
                            lastSeenTick: currentTick,
                            cepM: 0,
                            status: TrackStatus.Active,
                            classification,
                            identification,
                            confidence: 0.5
                        };
                        commands.push(new CreateTrackCommand(observer.id, newTrack));
                    }
                }
            }
        }

        return commands;
    }

    private identifyAndClassify(observerSide: string, target: any, world: IWorldView): { identification: IdentificationStatus, classification: string } {
        let identification = IdentificationStatus.UNKNOWN;
        const targetSide = target.side;

        if (targetSide === observerSide) {
            identification = IdentificationStatus.FRIENDLY;
        } else if (
            (observerSide === 'Blue' && targetSide === 'Red') ||
            (observerSide === 'Red' && targetSide === 'Blue')
        ) {
            identification = IdentificationStatus.HOSTILE;
        }

        let classification = 'Unknown';
        const profile = target.profileId ? world.profileRegistry.get(target.profileId) : undefined;
        
        if (profile) {
            switch (profile.type) {
                case 'Aircraft':
                case 'Helicopter':
                    classification = 'Air'; break;
                case 'Ship':
                    classification = 'Surface'; break;
                case 'Submarine':
                    classification = 'Subsurface'; break;
                case 'Weapon':
                    classification = 'Weapon'; break;
                case 'Mine':
                    classification = 'Mine'; break;
            }
        }

        // Fallback to altitude-based if profile is missing
        if (classification === 'Unknown') {
            const transform = target.getComponent(TransformComponent);
            if (transform) {
                const z = transform.position.z;
                if (z >= 25) {
                    classification = 'Air';
                } else if (z < 0) {
                    classification = 'Subsurface';
                } else {
                    classification = 'Surface';
                }
            }
        }

        return { identification, classification };
    }
}

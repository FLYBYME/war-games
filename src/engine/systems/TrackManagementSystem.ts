import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, CreateTrackCommand, UpdateTrackCommand, DropTrackCommand } from '../core/Command.js';
import { DetectionComponent } from '../components/Sensors.js';
import type { ESMBearing } from '../components/Sensors.js';
import { TrackComponent } from '../components/Track.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { CombatComponent } from '../components/Combat.js';
import { Track, TrackStatus, IdentificationStatus, Side, Vector3 } from '../core/Types.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';
import { Triangulation } from '../math/Triangulation.js';
import { JammerComponent, JammerMode } from '../components/ElectronicWarfare.js';

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
        lastTruePosition?: Vector3,
        lastUpdateTick: number,
        isESMOnly?: boolean,
        supportingBearings: ESMBearing[]
    }>();

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];
        const currentTick = world.currentTick;

        for (const observer of world.getEntities()) {
            const trackComp = observer.getComponent(TrackComponent);
            const detection = observer.getComponent(DetectionComponent);
            const obsTransform = observer.getComponent(TransformComponent);
            if (!trackComp || !detection || !obsTransform) continue;

            const detectedThisTick = new Set<string>();

            // 1. Process "Hard" Detections (Radar, Sonar, Visual)
            for (const targetId of detection.detectedEntityIds) {
                const target = world.getEntity(targetId);
                
                // Case 59: Handling Ghost Tracks (No truth data)
                if (!target) {
                    if (targetId.startsWith('GHOST-')) {
                        let track = Array.from(trackComp.tracks.values()).find(t => t.trueEntityId === targetId);
                        if (!track) {
                            // Create temporary ghost track
                            const trackId = `GHOST-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
                            const newTrack: Track = {
                                id: trackId,
                                trueEntityId: targetId,
                                position: { 
                                    x: obsTransform.position.x + (Math.random() - 0.5) * 10000, 
                                    y: obsTransform.position.y + (Math.random() - 0.5) * 10000, 
                                    z: 0 
                                },
                                velocity: { x: 0, y: 0, z: 0 },
                                firstSeenTick: currentTick,
                                lastSeenTick: currentTick,
                                cepM: 5000, 
                                status: TrackStatus.Active,
                                classification: 'Unknown',
                                identification: IdentificationStatus.SUSPECT,
                                confidence: 0.1
                            };
                            trackComp.tracks.set(newTrack.id, newTrack);
                            detectedThisTick.add(targetId);
                        } else {
                            track.lastSeenTick = currentTick;
                            detectedThisTick.add(targetId);
                        }
                    }
                    continue;
                }

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
                    
                    // Case 59: Jamming Penalty
                    const targetJammer = target.getComponent(JammerComponent);
                    if (targetJammer?.isActive) {
                        track.cepM = Math.max(500, track.cepM * 1.2); // Expand error while jammed
                    } else {
                        track.cepM = Math.max(10, track.cepM * 0.8); // Improve CEP on update
                    }
                } else {
                    const trackId = `TRK-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
                    const newTrack: Track = {
                        id: trackId,
                        trueEntityId: targetId,
                        position: { ...transform.position },
                        velocity: kinematics ? { ...kinematics.velocity } : { x: 0, y: 0, z: 0 },
                        firstSeenTick: world.currentTick,
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
                        isESMOnly: false,
                        supportingBearings: []
                    });
                    track = newTrack;
                }

                // Identification Logic (Hostile Act)
                this.checkHostileAct(world, target, track);
            }

            // 2. Process ESM Bearings (Case 54 & 55)
            const bearingsByTrueId = new Map<string, ESMBearing[]>();
            for (const bearing of detection.esmBearings) {
                if (!bearing.targetId) continue;
                const list = bearingsByTrueId.get(bearing.targetId) || [];
                list.push(bearing);
                bearingsByTrueId.set(bearing.targetId, list);
            }

            for (const [targetId, bearings] of bearingsByTrueId.entries()) {
                if (detectedThisTick.has(targetId)) continue; // Already have hard track

                const target = world.getEntity(targetId);
                if (!target) continue;

                let track = Array.from(trackComp.tracks.values()).find(t => t.trueEntityId === targetId);
                const targetTransform = target.getComponent(TransformComponent);
                if (!targetTransform) continue;

                // Create or update "Bearing Track"
                if (!track) {
                    const trackId = `ESM-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
                    
                    let initialPos = { ...targetTransform.position };
                    let initialCep = 50000;
                    let initialStatus = TrackStatus.Coasting;

                    if (bearings.length >= 2) {
                        const triInputs = bearings.map(b => ({
                            pos: b.observerPos || { x: 0, y: 0, z: 0 },
                            bearingDeg: b.bearingDeg
                        }));
                        const result = Triangulation.resolvePosition(triInputs);
                        if (result) {
                            initialPos = { ...result.position };
                            initialCep = result.cepM;
                            initialStatus = TrackStatus.Active;
                        }
                    }

                    track = {
                        id: trackId,
                        trueEntityId: targetId,
                        position: initialPos,
                        velocity: { x: 0, y: 0, z: 0 },
                        firstSeenTick: world.currentTick,
                        lastSeenTick: world.currentTick,
                        cepM: initialCep,
                        status: initialStatus,
                        classification: 'ESM-Strobe',
                        identification: IdentificationStatus.PENDING,
                        confidence: 0.05
                    };
                    trackComp.tracks.set(track.id, track);
                    this.trackMetadata.set(track.id, { 
                        detectionCount: 1, 
                        lastUpdateTick: world.currentTick,
                        isESMOnly: true,
                        supportingBearings: [...bearings]
                    });
                } else {
                    const meta = this.getMetadata(track.id);
                    if (meta.isESMOnly) {
                        track.lastSeenTick = world.currentTick;
                        meta.supportingBearings = [...bearings];
                        
                        // Case 55: Triangulation
                        if (bearings.length >= 2) {
                            const triInputs = bearings.map(b => ({
                                pos: b.observerPos || { x: 0, y: 0, z: 0 },
                                bearingDeg: b.bearingDeg
                            }));
                            const result = Triangulation.resolvePosition(triInputs);
                            if (result) {
                                track.position = { ...result.position };
                                track.cepM = result.cepM;
                                track.status = TrackStatus.Active;
                            }
                        } else {
                            track.position = { ...targetTransform.position };
                            track.cepM = 50000;
                        }
                    }
                }
                detectedThisTick.add(targetId);
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
                    const target = world.getEntity(track.trueEntityId);
                    const isJammed = target?.getComponent(JammerComponent)?.isActive;
                    
                    if (!meta.isESMOnly && !id.includes('GHOST')) {
                        // Normally reset to 100 on update, but allow expansion if jammed
                        if (track.cepM > 100 && !isJammed) track.cepM = 100;
                    }
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
            meta = { detectionCount: 0, lastUpdateTick: 0, supportingBearings: [] };
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

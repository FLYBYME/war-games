import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, AddDetectionCommand, RemoveDetectionCommand, UpdateSensorScanCommand, SyncESMBearingsCommand } from '../core/Command.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { SensorComponent, DetectionComponent, ESMBearing } from '../components/Sensors.js';
import { SensorType, Vector3 } from '../core/Types.js';
import { RCSComponent } from '../components/Signatures.js';
import { JammerComponent, JammerType } from '../components/ElectronicWarfare.js';
import { AcousticSignatureComponent } from '../components/Subsurface.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { TerrainOracle } from '../environment/TerrainOracle.js';
import { GeoProjection } from '../math/GeoProjection.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';
import { EntityId } from '../core/Types.js';
import { Entity } from '../core/Entity.js';
import { HealthComponent, SubsystemType } from '../components/Health.js';
import { DoctrineComponent, EMCONState } from '../components/Doctrine.js';
import { logger } from '../core/Logger.js';
import { ProfileRegistry } from '../core/ProfileRegistry.js';

export class SensorSystem implements ISystem {
    readonly name = 'SensorSystem';
    readonly dependencies = ['KinematicsSystem', 'EnvironmentSystem'];
    readonly phase = SystemPhase.Perception;

    private losCache = new Map<string, boolean>();

    constructor(
        private terrain: TerrainOracle,
        private projection: GeoProjection
    ) {}

    public async process(world: IWorldView, dt: number): Promise<Command[]> {
        const commands: Command[] = [];
        this.losCache.clear();
        const noiseMap = this.calculateNoiseEnvironment(world);

        for (const observer of world.getEntities()) {
            const sensors = observer.getComponents(SensorComponent);
            const detection = observer.getComponent(DetectionComponent);
            const transform = observer.getComponent(TransformComponent);
            const env = observer.getComponent(EnvironmentComponent);
            const kin = observer.getComponent(KinematicsComponent);
            const doctrine = observer.getComponent(DoctrineComponent) as DoctrineComponent;
            const health = observer.getComponent(HealthComponent);

            if (!sensors.length || !detection || !transform) continue;

            const sensorSubs = health?.subsystems.filter(s => s.type === SubsystemType.Sensors) || [];
            if (sensorSubs.length > 0 && sensorSubs.every(s => !s.isFunctional)) continue;

            const candidates = world.getNearbyEntities(transform.position, 200000); 
            const observerNoiseWatts = noiseMap.get(observer.id) || this.dbmToWatts(Physics.NOISE_FLOOR_DBM);

            const newlyDetectedInTick = new Set<string>();
            const currentESMBearings: ESMBearing[] = [];

            for (const sensor of sensors) {
                if (!sensor.isActive) continue;

                if (doctrine && doctrine.emcon === EMCONState.Silent) {
                    if (sensor.sensorType === SensorType.Radar || sensor.sensorType === SensorType.Sonar) {
                        continue;
                    }
                }
                
                let currentAz = sensor.currentAzimuth;
                if (sensor.scanPeriodS > 0) {
                    currentAz = (currentAz + (360 / sensor.scanPeriodS) * dt) % 360;
                    commands.push(new UpdateSensorScanCommand(observer.id, currentAz));
                }

                for (const target of candidates) {
                    if (target.id === observer.id) continue;
                    if (newlyDetectedInTick.has(target.id)) continue;

                    // V3 Optimization: Ignore friendly weapons
                    if (target.side === observer.side) {
                        const profileRegistry = world.profileRegistry as ProfileRegistry;
                        const targetProfile = target.profileId ? profileRegistry.get(target.profileId) : undefined;
                        if (targetProfile?.type === 'Weapon') continue;
                    }

                    const targetTransform = target.getComponent(TransformComponent);
                    const targetKin = target.getComponent(KinematicsComponent);
                    if (!targetTransform) continue;

                    const dist = VectorMath.distance(transform.position, targetTransform.position);
                    const vTargetWorld = VectorMath.subtract(targetTransform.position, transform.position);
                    const vTargetBody = VectorMath.rotateEulerInverse(vTargetWorld, transform.rotation, transform.pitch, transform.roll);
                    const targetAzBody = (Math.atan2(vTargetBody.y, vTargetBody.x) * Physics.RAD_TO_DEG + 360) % 360;

                    const isType = (t: SensorType) => sensor.sensorType.toLowerCase() === t.toLowerCase();
                    let isDetected = false;
                    let isESMOnly = false;

                    if (this.isInBlindArc(targetAzBody, sensor)) continue;

                    if (isType(SensorType.ESM)) {
                        isDetected = this.calculateESMDetection(sensor, target, dist);
                        if (isDetected) {
                            isESMOnly = true;
                            currentESMBearings.push({
                                observerId: observer.id,
                                bearingDeg: (transform.rotation + targetAzBody) % 360,
                                confidencePct: 100, // For now
                                targetId: target.id
                            });
                        }
                    } else if (dist <= sensor.maxRangeM) {
                        if (isType(SensorType.Radar)) {
                            if (!this.isWithinRadarHorizon(transform.position.z, targetTransform.position.z, dist)) continue;
                        }
                        
                        if (sensor.beamWidthDeg < 360 && !this.isAngleInBeam(targetAzBody, currentAz, sensor.beamWidthDeg)) continue;

                        const isSonar = isType(SensorType.Sonar);
                        const hasLOS = isSonar ? true : await this.checkLOS(transform.position, targetTransform.position, observer.id, target.id);

                        if (hasLOS) {
                            if (isType(SensorType.Radar)) {
                                const rcsComp = target.getComponent(RCSComponent);
                                const rcs = rcsComp?.getEffectiveRCS(sensor.band, 0) || 1.0;
                                isDetected = this.calculateRadarDetection(sensor, env, dist, rcs, observerNoiseWatts, target);

                                if (isDetected && kin && targetKin) {
                                    isDetected = !this.isDopplerNotched(transform.position, kin.velocity, targetTransform.position, targetKin.velocity);
                                }
                            } else if (isSonar) {
                                const targetEnv = target.getComponent(EnvironmentComponent);
                                const sl = target.getComponent(AcousticSignatureComponent)?.baseSL || 100;
                                isDetected = this.calculateSonarDetection(transform.position.z, targetTransform.position.z, env, targetEnv, dist, sl);
                            } else {
                                const cloudPenalty = env?.cloudCover || 0;
                                isDetected = dist <= (sensor.maxRangeM * (1.0 - cloudPenalty));
                            }
                        }
                    }

                    if (isDetected && !isESMOnly) {
                        if (!detection.detectedEntityIds.has(target.id)) {
                            logger.info(`New detection! observer=${observer.id} target=${target.id} sensor=${sensor.sensorType}`);
                            commands.push(new AddDetectionCommand(observer.id, target.id));
                            newlyDetectedInTick.add(target.id);
                        }
                    }
                }
            }

            if (currentESMBearings.length > 0) {
                commands.push(new SyncESMBearingsCommand(observer.id, currentESMBearings));
            }

            for (const targetId of detection.detectedEntityIds) {
                const target = world.getEntity(targetId);
                if (!target) {
                    commands.push(new RemoveDetectionCommand(observer.id, targetId));
                    continue;
                }
                const targetTransform = target.getComponent(TransformComponent);
                if (!targetTransform) {
                    commands.push(new RemoveDetectionCommand(observer.id, targetId));
                    continue;
                }
                const dist = VectorMath.distance(transform.position, targetTransform.position);
                const vTargetWorld = VectorMath.subtract(targetTransform.position, transform.position);
                const vTargetBody = VectorMath.rotateEulerInverse(vTargetWorld, transform.rotation, transform.pitch, transform.roll);
                const targetAzBody = (Math.atan2(vTargetBody.y, vTargetBody.x) * Physics.RAD_TO_DEG + 360) % 360;

                let stillDetectable = false;
                for (const sensor of sensors) {
                    if (!sensor.isActive) continue;
                    const isType = (t: SensorType) => sensor.sensorType.toLowerCase() === t.toLowerCase();
                    if (isType(SensorType.ESM)) continue; // ESM doesn't maintain 'hard' detection in detectedEntityIds
                    
                    if (this.isInBlindArc(targetAzBody, sensor)) continue;

                    if (dist <= sensor.maxRangeM) {
                        if (isType(SensorType.Radar)) {
                            if (!this.isWithinRadarHorizon(transform.position.z, targetTransform.position.z, dist)) continue;
                        }
                        const hasLOS = await this.checkLOS(transform.position, targetTransform.position, observer.id, target.id);
                        if (hasLOS) {
                            if (isType(SensorType.Radar)) {
                                const rcsComp = target.getComponent(RCSComponent);
                                const rcs = rcsComp?.getEffectiveRCS(sensor.band, 0) || 1.0;
                                stillDetectable = this.calculateRadarDetection(sensor, env, dist, rcs, observerNoiseWatts, target);
                                if (stillDetectable && kin) {
                                    const targetKin = target.getComponent(KinematicsComponent);
                                    if (targetKin) {
                                        stillDetectable = !this.isDopplerNotched(transform.position, kin.velocity, targetTransform.position, targetKin.velocity);
                                    }
                                }
                            } else if (isType(SensorType.Sonar)) {
                                const targetEnv = target.getComponent(EnvironmentComponent);
                                const sl = target.getComponent(AcousticSignatureComponent)?.baseSL || 100;
                                stillDetectable = this.calculateSonarDetection(transform.position.z, targetTransform.position.z, env, targetEnv, dist, sl);
                            } else {
                                const cloudPenalty = env?.cloudCover || 0;
                                stillDetectable = dist <= (sensor.maxRangeM * (1.0 - cloudPenalty));
                            }
                        }
                    }
                    if (stillDetectable) break;
                }
                if (!stillDetectable) {
                    commands.push(new RemoveDetectionCommand(observer.id, targetId));
                }
            }
        }
        return commands;
    }

    private calculateNoiseEnvironment(world: IWorldView): Map<EntityId, number> {
        const noiseMap = new Map<EntityId, number>();
        const jammers: { pos: Vector3, jammer: JammerComponent, entity: Entity }[] = [];
        for (const entity of world.getEntities()) {
            const jammer = entity.getComponent(JammerComponent);
            const transform = entity.getComponent(TransformComponent);
            if (jammer && jammer.isActive && transform) {
                jammers.push({ pos: transform.position, jammer, entity });
            }
        }
        for (const entity of world.getEntities()) {
            if (!entity.hasComponent(SensorComponent)) continue;
            const transform = entity.getComponent(TransformComponent);
            if (!transform) continue;
            let totalNoiseWatts = this.dbmToWatts(Physics.NOISE_FLOOR_DBM);
            for (const j of jammers) {
                if (j.jammer.jammerType !== JammerType.SOJ) continue;
                
                const dist = VectorMath.distance(transform.position, j.pos);
                if (dist < 10) continue; 

                // Directional Check for SOJ
                if (j.jammer.beamWidthDeg < 360) {
                    const vToVictim = VectorMath.subtract(transform.position, j.pos);
                    const jammerTransform = j.entity.getComponent(TransformComponent);
                    const jammerHeading = jammerTransform?.rotation || 0;
                    const angleToVictim = (Math.atan2(vToVictim.y, vToVictim.x) * Physics.RAD_TO_DEG + 360) % 360;
                    
                    if (!this.isAngleInBeam(angleToVictim, jammerHeading, j.jammer.beamWidthDeg)) {
                        continue;
                    }
                }

                const gain = Math.pow(10, j.jammer.directionalGainDb / 10);
                const lambda = Physics.LIGHT_SPEED / j.jammer.frequencyHz;
                const jammerNoise = (j.jammer.powerWatts * gain * lambda * lambda) / (Math.pow(4 * Math.PI * dist, 2));
                totalNoiseWatts += jammerNoise;
            }
            noiseMap.set(entity.id, totalNoiseWatts);
        }
        return noiseMap;
    }

    private isWithinRadarHorizon(h1: number, h2: number, dist: number): boolean {
        const h1_eff = Math.max(30, h1);
        const h2_eff = Math.max(15, h2);
        const horizonKm = 4.12 * (Math.sqrt(h1_eff) + Math.sqrt(h2_eff));
        return dist <= horizonKm * 1000;
    }

    private calculateRadarDetection(sensor: SensorComponent, env: EnvironmentComponent | undefined, dist: number, rcs: number, noiseWatts: number, target: Entity): boolean {
        if (dist < 1) return true;
        const ptWatts = sensor.txPowerKw * 1000;
        const g = Math.pow(10, Physics.RADAR_GAIN_DBI / 10);
        const lambda = Physics.LIGHT_SPEED / (sensor.frequencyMhz * 1e6);
        const pg = Math.pow(10, sensor.processingGainDb / 10);
        const numerator = ptWatts * g * g * lambda * lambda * rcs * pg;
        const denominator = Math.pow(4 * Math.PI, 3) * Math.pow(dist, 4);
        let prWatts = numerator / denominator;
        if (env && env.precipitationRateMMhr > 0 && sensor.frequencyMhz > 5000) {
            const attnDbPerKm = 0.1 * Math.pow(env.precipitationRateMMhr, 1.1);
            const totalAttnDb = attnDbPerKm * (dist / 1000) * 2;
            prWatts *= Math.pow(10, -totalAttnDb / 10);
        }
        let effectiveNoiseWatts = noiseWatts;
        const targetJammer = target.getComponent(JammerComponent);
        if (targetJammer && targetJammer.isActive && targetJammer.jammerType === JammerType.SPJ) {
            const lambda = Physics.LIGHT_SPEED / (sensor.frequencyMhz * 1e6);
            const prJammerWatts = (targetJammer.powerWatts * lambda * lambda) / (Math.pow(4 * Math.PI * dist, 2));
            effectiveNoiseWatts += prJammerWatts;
        }
        if (env && env.seaState > 3) {
            const clutterDb = (env.seaState - 3) * 10;
            effectiveNoiseWatts += this.dbmToWatts(Physics.NOISE_FLOOR_DBM + clutterDb);
        }
        const snrDb = 10 * Math.log10(prWatts / effectiveNoiseWatts);
        const threshold = Physics.RADAR_MIN_SNR_DB;
        const pd = 1 / (1 + Math.exp(-1.5 * (snrDb - threshold)));
        return Math.random() < pd;
    }

    private calculateESMDetection(esm: SensorComponent, target: Entity, dist: number): boolean {
        const radars = target.getComponents(SensorComponent);
        for (const radar of radars) {
            if (radar.isActive && radar.sensorType === SensorType.Radar) {
                const ptWatts = radar.txPowerKw * 1000;
                const gt = Math.pow(10, Physics.RADAR_GAIN_DBI / 10);
                const gr = 1.0; 
                const lambda = Physics.LIGHT_SPEED / (radar.frequencyMhz * 1e6);
                const prWatts = (ptWatts * gt * gr * lambda * lambda) / (Math.pow(4 * Math.PI * dist, 2));
                const prDbm = 10 * Math.log10(prWatts) + 30;
                if (prDbm >= esm.sensitivityDbm) return true;
            }
        }
        const jammer = target.getComponent(JammerComponent);
        if (jammer && jammer.isActive) {
            const gain = Math.pow(10, (jammer.directionalGainDb || 0) / 10);
            const lambda = Physics.LIGHT_SPEED / jammer.frequencyHz;
            const prWatts = (jammer.powerWatts * gain * lambda * lambda) / (Math.pow(4 * Math.PI * dist, 2));
            const prDbm = 10 * Math.log10(prWatts) + 30;
            if (prDbm >= esm.sensitivityDbm) return true;
        }
        return false;
    }

    private isInBlindArc(azBody: number, sensor: SensorComponent): boolean {
        if (sensor.blindArcStartDeg === undefined || sensor.blindArcEndDeg === undefined) return false;
        const start = sensor.blindArcStartDeg;
        const end = sensor.blindArcEndDeg;
        if (start < end) return azBody >= start && azBody <= end;
        else return azBody >= start || azBody <= end;
    }

    private isAngleInBeam(targetAz: number, beamAz: number, width: number): boolean {
        let diff = Math.abs(targetAz - beamAz);
        if (diff > 180) diff = 360 - diff;
        return diff <= width / 2;
    }

    private isDopplerNotched(obsPos: Vector3, obsVel: Vector3, tgtPos: Vector3, tgtVel: Vector3): boolean {
        const vRel = VectorMath.subtract(tgtVel, obsVel);
        const uLOS = VectorMath.normalize(VectorMath.subtract(tgtPos, obsPos));
        const vRadial = VectorMath.dot(vRel, uLOS);
        return Math.abs(vRadial) < 2.0;
    }

    private calculateSonarDetection(z1: number, z2: number, env: EnvironmentComponent | undefined, targetEnv: EnvironmentComponent | undefined, dist: number, sl: number): boolean {
        if (dist < 1) return true;
        let tl = 20 * Math.log10(dist); 
        tl += (dist / 1000) * 0.1; 
        const layerDepth = env?.layerDepthM || Physics.SURFACE_LAYER_DEPTH_M;
        const d1 = -z1;
        const d2 = -z2;
        if (d1 <= layerDepth && d2 <= layerDepth) {
            tl -= 15;
        } else if ((d1 > layerDepth) !== (d2 > layerDepth)) {
            tl += 30;
        }
        const czRange = 50000;
        const czWindow = 3000;
        if (Math.abs(dist % czRange) < czWindow && dist > 10000) {
            tl -= 25;
        }
        const seaState = env?.seaState || targetEnv?.seaState || 0;
        const ambientNoise = Physics.AMBIENT_OCEAN_NOISE_DB + (seaState * 3);
        const snrDb = sl - tl - ambientNoise;
        const threshold = Physics.SONAR_DT_DB;
        const pd = 1 / (1 + Math.exp(-0.8 * (snrDb - threshold))); 
        return Math.random() < pd;
    }

    private dbmToWatts(dbm: number): number {
        return Math.pow(10, (dbm - 30) / 10);
    }

    private async checkLOS(pos1: Vector3, pos2: Vector3, id1: string, id2: string): Promise<boolean> {
        const key = id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
        if (this.losCache.has(key)) return this.losCache.get(key)!;
        const hasLOS = await this.terrain.isLineOfSightClear(pos1, pos2, this.projection);
        this.losCache.set(key, hasLOS);
        return hasLOS;
    }
}

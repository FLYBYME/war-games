import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, FireWeaponCommand } from '../core/Command.js';
import { CombatComponent } from '../components/Combat.js';
import { TrackComponent } from '../components/Track.js';
import { DoctrineComponent, ROE } from '../components/Doctrine.js';
import { IdentificationStatus, Vector3 } from '../core/Types.js';
import { WeaponProfileRegistry, GuidanceType } from '../core/WeaponProfileRegistry.js';
import { FireControl } from '../math/FireControl.js';
import { KinematicsComponent, TransformComponent } from '../components/Physics.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { VectorMath } from '../math/VectorMath.js';
import { Physics } from '../PhysicsConstants.js';
import { HealthComponent, SubsystemType } from '../components/Health.js';
import { EventSeverity } from '../components/Telemetry.js';
import { logger } from '../core/Logger.js';

/**
 * CombatSystem: Manages weapon engagement logic.
 * Implements Doctrine (ROE and WRA).
 */
export class CombatSystem implements ISystem {
    readonly name = 'CombatSystem';
    readonly phase = SystemPhase.Lifecycle;
    readonly dependencies = ['PhysicsSystem', 'GuidanceSystem'];

    constructor(private weaponProfiles: WeaponProfileRegistry) {}

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const combat = entity.getComponent(CombatComponent);
            const tracks = entity.getComponent(TrackComponent);
            const doctrine = entity.getComponent(DoctrineComponent) as DoctrineComponent;
            const transform = entity.getComponent(TransformComponent);
            const health = entity.getComponent(HealthComponent);

            if (!combat || !tracks || !doctrine || !transform) continue;

            // 0. Check Subsystem Health (Firepower Kill)
            const combatSubs = health?.subsystems.filter(s => s.type === SubsystemType.Combat) || [];
            const isCombatKill = combatSubs.length > 0 && combatSubs.every(s => !s.isFunctional);
            
            if (isCombatKill) continue;

            // CombatSystem now handles manual assignments or secondary logic.
            // WRAExecutorSystem handles automated engagements based on Doctrine.
            for (let i = 0; i < combat.mounts.length; i++) {
                const mount = combat.mounts[i];
                const targetId = mount.currentTargetId || combat.currentTargetId;

                if (targetId) {
                    const tracks = entity.getComponent(TrackComponent);
                    if (!tracks) continue;

                    let targetTrack = undefined;
                    for (const t of tracks.tracks.values()) {
                        if (t.trueEntityId === targetId) {
                            targetTrack = t;
                            break;
                        }
                    }

                    if (!targetTrack) continue;
                    const targetPos = targetTrack.position;

                    // 1. Fire Control Solution
                    const magIdx = mount.magazineIndices[mount.activeMagazineIndex];
                    const magazine = combat.magazines[magIdx];
                    const weaponProfile = magazine ? this.weaponProfiles.get(magazine.weaponProfileId) : undefined;
                    
                    const shooterVel = entity.getComponent(KinematicsComponent)?.velocity || { x: 0, y: 0, z: 0 };
                    const targetVel = (targetTrack as any).velocity || { x: 0, y: 0, z: 0 };
                    const env = entity.getComponent(EnvironmentComponent);
                    
                    // We use a default profile for slewing if no weapon is loaded, or the actual weapon profile
                    const solution = this.calculateSolution(world, weaponProfile || { maxSpeedKts: 2000 } as any, transform.position, shooterVel, targetPos, targetVel, env);
                    
                    let isAligned = false;
                    if (solution) {
                        // Transform world-relative solution to body-relative
                        let relativeAz = solution.azimuthDeg - transform.rotation;
                        while (relativeAz > 180) relativeAz -= 360;
                        while (relativeAz < -180) relativeAz += 360;

                        // Simple pitch subtraction
                        const relativeEl = solution.elevationDeg - transform.pitch;

                        isAligned = this.updateMountSlew(mount, relativeAz, relativeEl, _dt);
                    }

                    // 2. Engagement Logic
                    if (world.currentTick - mount.lastFireTick < mount.reloadTicks) continue;
                    if (!magazine || magazine.currentCount <= 0) continue;
                    if (!weaponProfile) continue;

                    const dist = VectorMath.distance(transform.position, targetPos);
                    const shooterAlt = transform.position.z;
                    const maxRange = WeaponProfileRegistry.getEffectiveMaxRange(weaponProfile, shooterAlt);

                    if (dist <= maxRange && isAligned) {
                        logger.info(`Manual engagement`, { shooterId: entity.id, targetId: targetTrack.trueEntityId, weapon: weaponProfile.id });
                        commands.push(new FireWeaponCommand(entity.id, i, targetTrack.trueEntityId as string));
                        
                        world.recordEvent({
                            tick: world.currentTick,
                            severity: EventSeverity.Combat,
                            category: 'WEAPONS',
                            message: `${entity.id} fired at ${targetTrack.trueEntityId}`,
                            entityId: entity.id,
                            pos: transform.position
                        });
                    }
                }
            }
        }

        return commands;
    }

    private calculateSolution(world: IWorldView, profile: any, pos: Vector3, vel: Vector3, targetPos: Vector3, targetVel: Vector3, env?: any) {
        if (profile.guidance === GuidanceType.Ballistic) {
            // Fetch Projectile Profile for mass/drag if available
            const projectileProfile = profile.entityProfileId ? world.profileRegistry.get(profile.entityProfileId) : undefined;
            
            return FireControl.calculateAdvancedBallisticSolution(
                pos,
                vel || { x: 0, y: 0, z: 0 },
                targetPos,
                targetVel || { x: 0, y: 0, z: 0 },
                profile.maxSpeedKts * Physics.KTS_TO_MPS,
                projectileProfile?.kinematics?.massKg || 10,
                projectileProfile?.kinematics?.dragCoeff || 0.05,
                profile.burst?.caliberMm || 127,
                env?.windVelocity || { x: 0, y: 0, z: 0 },
                env?.airDensity || 1.225
            );
        } else {
            const vToTarget = VectorMath.subtract(targetPos, pos);
            const azimuthDeg = (Math.atan2(vToTarget.y, vToTarget.x) * Physics.RAD_TO_DEG + 360) % 360;
            const horizontalDist = Math.sqrt(vToTarget.x * vToTarget.x + vToTarget.y * vToTarget.y);
            const elevationDeg = Math.atan2(vToTarget.z, horizontalDist) * Physics.RAD_TO_DEG;
            return { azimuthDeg, elevationDeg };
        }
    }

    private updateMountSlew(mount: any, targetAz: number, targetEl: number, dt: number): boolean {
        if (mount.slewRate <= 0) {
            mount.currentAzimuth = targetAz;
            mount.currentElevation = targetEl;
            return true;
        }

        const maxSlew = mount.slewRate * dt;

        // Azimuth
        let azDiff = targetAz - mount.currentAzimuth;
        while (azDiff > 180) azDiff -= 360;
        while (azDiff < -180) azDiff += 360;

        const azStep = Math.sign(azDiff) * Math.min(Math.abs(azDiff), maxSlew);
        mount.currentAzimuth += azStep;

        // Elevation
        const elDiff = targetEl - mount.currentElevation;
        const elStep = Math.sign(elDiff) * Math.min(Math.abs(elDiff), maxSlew);
        mount.currentElevation += elStep;

        // Check if aligned
        const threshold = mount.alignmentThresholdDeg ?? 1.0;
        return Math.abs(azDiff) < threshold && Math.abs(elDiff) < threshold;
    }
}

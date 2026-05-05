import { CommandHandler } from '../CommandDispatcher.js';
import { 
    FireWeaponCommand, FireSalvoCommand, ApplyDamageCommand, DetonateCommand, 
    DestroyEntityCommand, ApplySubsystemDamageCommand, 
    SetConditionCommand, NextWeaponStageCommand, UpdateStageTicksCommand 
} from '../Command.js';
import { World } from '../World.js';
import { CombatComponent, SalvoComponent } from '../../components/Combat.js';
import { TransformComponent, KinematicsComponent } from '../../components/Physics.js';
import { HealthComponent } from '../../components/Health.js';
import { WeaponStageComponent } from '../../components/WeaponStages.js';
import { CollisionComponent } from '../../components/Collision.js';
import { WeaponProfileRegistry } from '../WeaponProfileRegistry.js';
import { Side } from '../Types.js';
import { EntityManager } from '../EntityManager.js';
import { logger } from '../Logger.js';
import { GuidanceComponent, GuidanceType as CompGuidanceType } from '../../components/Guidance.js';
import { GuidanceType as ProfGuidanceType } from '../WeaponProfileRegistry.js';
import { SensorComponent, DetectionComponent } from '../../components/Sensors.js';
import { PropulsionComponent } from '../../components/Propulsion.js';
import { SensorType, EMBand, SensorMode, MountingType } from '../Types.js';
import { VectorMath } from '../../math/VectorMath.js';
import { EnvironmentComponent } from '../../components/Environment.js';
import { FireControl } from '../../math/FireControl.js';

export class FireWeaponHandler implements CommandHandler<FireWeaponCommand> {
    execute(cmd: FireWeaponCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (!entity) return;
        const combat = entity.getComponent(CombatComponent);
        const transform = entity?.getComponent(TransformComponent);

        if (combat && transform) {
            const mount = combat.mounts[cmd.mountIndex];
            const magIdx = mount.magazineIndices[mount.activeMagazineIndex];
            const magazine = combat.magazines[magIdx];
            if (magazine && magazine.currentCount > 0) {
                const weaponProfile = world.weaponProfiles.get(magazine.weaponProfileId);
                const targetEntity = world.getEntity(cmd.targetId);
                
                if (targetEntity && weaponProfile) {
                    const targetTransform = targetEntity.getComponent(TransformComponent);
                    if (targetTransform) {
                         const projectileProfile = weaponProfile.entityProfileId ? world.profileRegistry.get(weaponProfile.entityProfileId) : undefined;
                         const shooterVel = entity.getComponent(KinematicsComponent)?.velocity || { x: 0, y: 0, z: 0 };
                         const targetVel = targetEntity.getComponent(KinematicsComponent)?.velocity || { x: 0, y: 0, z: 0 };
                         const env = entity.getComponent(EnvironmentComponent) as EnvironmentComponent;

                         // Use advanced ballistic solution for alignment check
                         const solution = FireControl.calculateAdvancedBallisticSolution(
                             transform.position,
                             shooterVel,
                             targetTransform.position,
                             targetVel,
                             (weaponProfile.maxSpeedKts || 0) * 0.514444,
                             projectileProfile?.kinematics?.massKg || 10,
                             projectileProfile?.kinematics?.dragCoeff || 0.05,
                             weaponProfile.burst?.caliberMm || 127,
                             env?.windVelocity || { x: 0, y: 0, z: 0 },
                             env?.airDensity || 1.225
                         );

                         if (solution && weaponProfile.type !== 'Missile') {
                             // Transform to body frame
                             let relativeAz = solution.azimuthDeg - transform.rotation;
                             while (relativeAz > 180) relativeAz -= 360;
                             while (relativeAz < -180) relativeAz += 360;
                             const relativeEl = solution.elevationDeg - transform.pitch;

                             // Check alignment
                             let azDiff = relativeAz - (mount.currentAzimuth || 0);
                             while (azDiff > 180) azDiff -= 360;
                             while (azDiff < -180) azDiff += 360;
                             azDiff = Math.abs(azDiff);

                             const elDiff = Math.abs(relativeEl - (mount.currentElevation || 0));
                             const threshold = mount.alignmentThresholdDeg ?? 1.0;
                             
                             if (azDiff > threshold || elDiff > threshold) {
                                if (mount.slewRate > 0) {
                                    mount.currentTargetId = cmd.targetId;
                                    logger.debug(`FireWeaponHandler rejected: mount ${mount.name} not aligned | targetAz: ${relativeAz.toFixed(1)} curAz: ${mount.currentAzimuth?.toFixed(1)} diff: ${azDiff.toFixed(1)}`);
                                    return;
                                }
                             }
                         }
                    }
                }

                // If we got here, we are aligned or it's a missile
                magazine.currentCount--;
                // Update lastFireTick to reset reload timer
                combat.mounts[cmd.mountIndex].lastFireTick = world.currentTick;
                
                // Demo logic: We spawn a physical entity for the weapon if it's a missile or a shell
                if (weaponProfile && (weaponProfile.type === 'Missile' || weaponProfile.type === 'Gun')) {
                    const targetEntity = world.getEntity(cmd.targetId);
                    if (targetEntity) {
                        const targetTransform = targetEntity.getComponent(TransformComponent);
                        if (targetTransform) {
                            const entityMgr = new EntityManager(world, (world as any).profileRegistry);
                            
                             // Spawn the munition entity
                             const munitionId = `${cmd.entityId}-${magazine.weaponProfileId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                             const projectileProfileId = weaponProfile.entityProfileId || `${magazine.weaponProfileId}-projectile`;
                             
                             // Calculate initial orientation to target using FireControl
                             const vToTarget = VectorMath.subtract(targetTransform.position, transform.position);
                             const groundDist = Math.sqrt(vToTarget.x * vToTarget.x + vToTarget.y * vToTarget.y);

                             const projectileProfile = weaponProfile.entityProfileId ? world.profileRegistry.get(weaponProfile.entityProfileId) : undefined;
                             const shooterVel = entity.getComponent(KinematicsComponent)?.velocity || { x: 0, y: 0, z: 0 };
                             const targetVel = targetEntity.getComponent(KinematicsComponent)?.velocity || { x: 0, y: 0, z: 0 };
                             const env = entity.getComponent(EnvironmentComponent) as EnvironmentComponent;

                             const solution = FireControl.calculateAdvancedBallisticSolution(
                                 transform.position,
                                 shooterVel,
                                 targetTransform.position,
                                 targetVel,
                                 (weaponProfile.maxSpeedKts || 0) * 0.514444,
                                 projectileProfile?.kinematics?.massKg || 10,
                                 projectileProfile?.kinematics?.dragCoeff || 0.05,
                                 weaponProfile.burst?.caliberMm || 127,
                                 env?.windVelocity || { x: 0, y: 0, z: 0 },
                                 env?.airDensity || 1.225
                             ) || { 
                                 azimuthDeg: (Math.atan2(vToTarget.y, vToTarget.x) * (180 / Math.PI) + 360) % 360, 
                                 elevationDeg: Math.atan2(vToTarget.z, groundDist) * (180 / Math.PI) 
                             };

                             const isVLS = mount.name?.toLowerCase().includes('vls') || magazine.weaponProfileId.toLowerCase().includes('vls');
                             const launchPitch = isVLS ? 85 : solution.elevationDeg;
                             const launchHdg = solution.azimuthDeg;


                             const munition = entityMgr.spawn({
                                 id: munitionId,
                                 profileId: projectileProfileId, // Maintain original case for registry lookups
                                 pos: [
                                     transform.position.x + (Math.random() - 0.5) * 5, 
                                     transform.position.y + (Math.random() - 0.5) * 5, 
                                     transform.position.z + 2
                                 ],
                                 heading: launchHdg,
                                 pitch: launchPitch,
                                 speedKts: weaponProfile.cruiseSpeedKts,
                                 side: entity?.side || Side.Neutral
                             });

                             const col = munition.getComponent(CollisionComponent);
                             if (col) col.ownerId = cmd.entityId;

                             // Set throttle and initial thrust for missiles, or just initial velocity for shells
                             if (weaponProfile.type === 'Missile') {
                                const prop = munition.getComponent(PropulsionComponent) as PropulsionComponent;
                                if (prop) {
                                    prop.throttle = 1.0;
                                    prop.currentThrustN = prop.maxThrustDryN;
                                }

                                // Add Guidance brain
                                let compGuidanceType = CompGuidanceType.INS;
                                switch (weaponProfile.guidance) {
                                    case ProfGuidanceType.Active: compGuidanceType = CompGuidanceType.ARH; break;
                                    case ProfGuidanceType.SemiActive: compGuidanceType = CompGuidanceType.SARH; break;
                                    case ProfGuidanceType.Passive: compGuidanceType = CompGuidanceType.IR; break;
                                    case ProfGuidanceType.Command: compGuidanceType = CompGuidanceType.Command; break;
                                }

                                munition.addComponent(new GuidanceComponent(
                                    compGuidanceType,
                                    cmd.targetId,
                                    compGuidanceType === CompGuidanceType.SARH ? cmd.entityId : undefined
                                ));

                                // If ARH, ensure it has a seeker sensor
                                if (compGuidanceType === CompGuidanceType.ARH) {
                                    if (!munition.getComponent(SensorComponent)) {
                                        munition.addComponent(new SensorComponent(
                                            SensorType.Radar,
                                            20000,
                                            true,
                                            45, 10, -10, 50, EMBand.X, SensorMode.Search, MountingType.Fixed, 0, 0, 0, undefined, undefined, undefined,
                                            'Seeker'
                                        ));
                                    }
                                    if (!munition.getComponent(DetectionComponent)) {
                                        munition.addComponent(new DetectionComponent());
                                    }
                                }
                                logger.info(`Weapon entity spawned: ${munitionId}`, { target: cmd.targetId, guidance: compGuidanceType });
                             } else {
                                 // Ballistic Shell: No guidance, just initial muzzle velocity
                                 logger.info(`Ballistic shell spawned: ${munitionId}`, { target: cmd.targetId });
                             }
                        }
                    }
                }

                world.events.emit({
                    type: 'WeaponFired',
                    tick: world.currentTick,
                    entityId: cmd.entityId,
                    targetId: cmd.targetId,
                    data: {
                        weaponProfileId: magazine.weaponProfileId,
                        mountIndex: cmd.mountIndex
                    }
                });
            }
        }
    }
}

export class FireSalvoHandler implements CommandHandler<FireSalvoCommand> {
    execute(cmd: FireSalvoCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        if (!entity) return;
        const combat = entity.getComponent(CombatComponent);
        const transform = entity?.getComponent(TransformComponent);

        if (combat && transform) {
            const mount = combat.mounts[cmd.mountIndex];
            const magIdx = mount.magazineIndices[mount.activeMagazineIndex];
            const magazine = combat.magazines[magIdx];
            
            if (magazine && magazine.currentCount > 0) {
                const quantity = Math.min(cmd.quantity, magazine.currentCount);
                magazine.currentCount -= quantity;
                mount.lastFireTick = world.currentTick;

                const weaponProfile = world.weaponProfiles.get(magazine.weaponProfileId);
                if (weaponProfile) {
                    const targetEntity = world.getEntity(cmd.targetId);
                    if (targetEntity) {
                        const targetTransform = targetEntity.getComponent(TransformComponent);
                        if (targetTransform) {
                             const entityMgr = new EntityManager(world, (world as any).profileRegistry);
                             // Unique but deterministic ID for the salvo in this tick
                             const munitionId = `${cmd.entityId}-${magazine.weaponProfileId}-salvo-${world.currentTick}-${cmd.mountIndex}`;
                             const projectileProfileId = weaponProfile.entityProfileId || `${magazine.weaponProfileId}-projectile`;
                             
                             // Calculate initial orientation to target using FireControl
                             const vToTarget = VectorMath.subtract(targetTransform.position, transform.position);
                             const groundDist = Math.sqrt(vToTarget.x * vToTarget.x + vToTarget.y * vToTarget.y);

                             const projectileProfile = weaponProfile.entityProfileId ? world.profileRegistry.get(weaponProfile.entityProfileId) : undefined;
                             const shooterVel = entity.getComponent(KinematicsComponent)?.velocity || { x: 0, y: 0, z: 0 };
                             const targetVel = targetEntity.getComponent(KinematicsComponent)?.velocity || { x: 0, y: 0, z: 0 };
                             const env = entity.getComponent(EnvironmentComponent) as EnvironmentComponent;

                             const solution = FireControl.calculateAdvancedBallisticSolution(
                                 transform.position,
                                 shooterVel,
                                 targetTransform.position,
                                 targetVel,
                                 (weaponProfile.maxSpeedKts || 0) * 0.514444,
                                 projectileProfile?.kinematics?.massKg || 10,
                                 projectileProfile?.kinematics?.dragCoeff || 0.05,
                                 weaponProfile.burst?.caliberMm || 127,
                                 env?.windVelocity || { x: 0, y: 0, z: 0 },
                                 env?.airDensity || 1.225
                             ) || { 
                                 azimuthDeg: (Math.atan2(vToTarget.y, vToTarget.x) * (180 / Math.PI) + 360) % 360, 
                                 elevationDeg: Math.atan2(vToTarget.z, groundDist) * (180 / Math.PI) 
                             };

                             const munition = entityMgr.spawn({
                                 id: munitionId,
                                 profileId: projectileProfileId,
                                 pos: [
                                     transform.position.x, 
                                     transform.position.y, 
                                     transform.position.z + 2
                                 ],
                                 heading: solution.azimuthDeg,
                                 pitch: solution.elevationDeg,
                                 speedKts: weaponProfile.cruiseSpeedKts,
                                 side: entity?.side || Side.Neutral
                             });

                             // Add SalvoComponent to track quantity
                             munition.addComponent(new SalvoComponent(quantity, quantity, weaponProfile.burst?.dispersionDeg || 0.1));
                             
                             const col = munition.getComponent(CollisionComponent);
                             if (col) col.ownerId = cmd.entityId;

                             logger.info(`Salvo entity spawned: ${munitionId}`, { target: cmd.targetId, qty: quantity });
                        }
                    }
                }

                world.events.emit({
                    type: 'WeaponFired',
                    tick: world.currentTick,
                    entityId: cmd.entityId,
                    targetId: cmd.targetId,
                    data: {
                        weaponProfileId: magazine.weaponProfileId,
                        mountIndex: cmd.mountIndex,
                        quantity
                    }
                });
            }
        }
    }
}

export class ApplyDamageHandler implements CommandHandler<ApplyDamageCommand> {
    execute(cmd: ApplyDamageCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const health = entity?.getComponent(HealthComponent);

        if (health) {
            const wasAlive = health.hp > 0;
            health.hp = Math.max(0, health.hp - cmd.damage);

            // Emit Impact event
            world.events.emit({
                type: 'Impact',
                tick: world.currentTick,
                entityId: cmd.entityId,
                data: {
                    damage: cmd.damage,
                    remainingHp: health.hp
                }
            });

            if (wasAlive && health.hp === 0) {
                world.events.emit({
                    type: 'EntityDestroyed',
                    tick: world.currentTick,
                    entityId: cmd.entityId,
                    data: {
                        killerId: 'unknown'
                    }
                });
            }
        }
    }
}

export class DetonateHandler implements CommandHandler<DetonateCommand> {
    execute(cmd: DetonateCommand, world: World): void {
        const transform = world.getEntity(cmd.entityId)?.getComponent(TransformComponent);
        if (transform) {
            const nearby = world.getNearbyEntities(transform.position, cmd.radius);
            for (const target of nearby) {
                world.queueExternalCommand(new ApplyDamageCommand(target.id, cmd.damage));
            }
            
            world.events.emit({
                type: 'Detonation',
                tick: world.currentTick,
                entityId: cmd.entityId,
                data: {
                    radius: cmd.radius,
                    damage: cmd.damage
                }
            });
        }
        // Destroy the detonating entity
        world.removeEntity(cmd.entityId);
    }
}

export class DestroyEntityHandler implements CommandHandler<DestroyEntityCommand> {
    execute(cmd: DestroyEntityCommand, world: World): void {
        world.removeEntity(cmd.entityId);
        logger.info(`Entity removed from world: ${cmd.entityId}`);
    }
}

export class ApplySubsystemDamageHandler implements CommandHandler<ApplySubsystemDamageCommand> {
    execute(cmd: ApplySubsystemDamageCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const health = entity?.getComponent(HealthComponent);
        if (health) {
            const sub = health.subsystems.find(s => s.id === cmd.subsystemId);
            if (sub) {
                sub.hp = Math.max(0, sub.hp - cmd.damage);
                sub.isFunctional = sub.hp > 0;
                
                world.events.emit({
                    type: 'SubsystemDamage',
                    tick: world.currentTick,
                    entityId: cmd.entityId,
                    data: {
                        subsystemId: cmd.subsystemId,
                        damage: cmd.damage,
                        remainingHp: sub.hp
                    }
                });
            }
        }
    }
}

export class SetConditionHandler implements CommandHandler<SetConditionCommand> {
    execute(cmd: SetConditionCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const health = entity?.getComponent(HealthComponent);
        if (health) {
            if (cmd.fires !== undefined) health.fires = cmd.fires;
            if (cmd.flooding !== undefined) health.flooding = cmd.flooding;
        }
    }
}

export class NextWeaponStageHandler implements CommandHandler<NextWeaponStageCommand> {
    execute(cmd: NextWeaponStageCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const weapon = entity?.getComponent(WeaponStageComponent);
        if (weapon) {
            weapon.currentStageIndex++;
            weapon.currentStageElapsedTicks = 0;
            logger.debug(`Weapon ${cmd.entityId} advanced to stage ${weapon.currentStageIndex}`);
        }
    }
}

export class UpdateStageTicksHandler implements CommandHandler<UpdateStageTicksCommand> {
    execute(cmd: UpdateStageTicksCommand, world: World): void {
        const entity = world.getEntity(cmd.entityId);
        const weapon = entity?.getComponent(WeaponStageComponent);
        if (weapon) {
            weapon.currentStageElapsedTicks += cmd.elapsedTicks;
        }
    }
}

import { CommandHandler } from '../CommandDispatcher.js';
import {
    FireWeaponCommand, FireSalvoCommand, ApplyDamageCommand, DetonateCommand,
    DestroyEntityCommand, ApplySubsystemDamageCommand,
    SetConditionCommand, NextWeaponStageCommand, UpdateStageTicksCommand
} from '../Command.js';
import { World } from '../World.js';
import { CombatComponent, SalvoComponent } from '../../components/Combat.js';
import { TransformComponent, KinematicsComponent } from '../../components/Physics.js';
import { HealthComponent, SubsystemType } from '../../components/Health.js';
import { WeaponStageComponent } from '../../components/WeaponStages.js';
import { CollisionComponent } from '../../components/Collision.js';
import { Side, SensorType, EMBand, SensorMode, MountingType, MissionType } from '../Types.js';
import { EntityManager } from '../EntityManager.js';
import { logger } from '../Logger.js';
import { GuidanceComponent, GuidanceType as CompGuidanceType } from '../../components/Guidance.js';
import { GuidanceType as ProfGuidanceType } from '../WeaponProfileRegistry.js';
import { SensorComponent, DetectionComponent } from '../../components/Sensors.js';
import { PropulsionComponent } from '../../components/Propulsion.js';
import { MissionComponent, MissionStatus } from '../../components/Missions.js';
import { VectorMath } from '../../math/VectorMath.js';
import { EnvironmentComponent } from '../../components/Environment.js';
import { FireControl } from '../../math/FireControl.js';

import { MunitionFactory } from '../MunitionFactory.js';

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
                                    logger.debug(`FireWeaponHandler rejected: mount ${mount.name} not aligned | targetAz: ${relativeAz.toFixed(1)} curAz: ${mount.currentAzimuth?.toFixed(1)} | targetEl: ${relativeEl.toFixed(1)} curEl: ${mount.currentElevation?.toFixed(1)} | diffs: az=${azDiff.toFixed(1)} el=${elDiff.toFixed(1)}`);
                                    throw new Error(`Mount ${mount.name} not aligned. Sluing to target... (Az: ${relativeAz.toFixed(1)}, El: ${relativeEl.toFixed(1)})`);
                                } else {
                                    throw new Error(`Mount ${mount.name} not aligned and cannot slew.`);
                                }
                            }
                        }
                    } else {
                        throw new Error(`Target ${cmd.targetId} has no transform.`);
                    }
                } else {
                    throw new Error(`Target ${cmd.targetId} or weapon profile not found.`);
                }

                // If we got here, we are aligned or it's a missile
                if (magazine.currentCount <= 0) {
                    throw new Error(`Magazine ${magazine.name} is empty.`);
                }
                
                const reloadProgress = world.currentTick - (mount.lastFireTick || 0);
                if (reloadProgress < mount.reloadTicks) {
                    throw new Error(`Mount ${mount.name} is reloading (${mount.reloadTicks - reloadProgress} ticks remaining).`);
                }

                magazine.currentCount--;
                world.stats.munitionsExpended++;
                // Update lastFireTick to reset reload timer
                combat.mounts[cmd.mountIndex].lastFireTick = world.currentTick;

                let munitionEntity;
                // Use MunitionFactory for spawning
                if (weaponProfile && (weaponProfile.type === 'Missile' || weaponProfile.type === 'Gun')) {
                    munitionEntity = MunitionFactory.spawnMunition(world, cmd.entityId, cmd.targetId, weaponProfile, mount.name || 'Default');
                }

                world.events.emit({
                    type: 'WeaponFired',
                    tick: world.currentTick,
                    entityId: cmd.entityId,
                    targetId: cmd.targetId,
                    data: {
                        weaponProfileId: magazine.weaponProfileId,
                        mountIndex: cmd.mountIndex,
                        munitionId: munitionEntity?.id
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
                world.stats.munitionsExpended += quantity;
                mount.lastFireTick = world.currentTick;

                const weaponProfile = world.weaponProfiles.get(magazine.weaponProfileId);
                if (weaponProfile) {
                    MunitionFactory.spawnSalvo(world, cmd.entityId, cmd.targetId, weaponProfile, mount.name || 'Default', quantity);
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
                health.isDestroyed = true;
                
                // Track losses for combatants (exclude weapons/munitions)
                const profile = world.profileRegistry.get(entity!.profileId || '');
                if (profile?.type !== 'Weapon') {
                    if (entity!.side === Side.Blue) world.stats.blue++;
                    if (entity!.side === Side.Red) world.stats.red++;
                }

                world.events.emit({
                    type: 'EntityDestroyed',
                    tick: world.currentTick,
                    entityId: cmd.entityId,
                    data: {
                        killerId: 'unknown'
                    }
                });

                // Also immediately remove if it's a munition, otherwise let the world reaper handle it
                if (profile?.type === 'Weapon') {
                    world.removeEntity(cmd.entityId);
                }
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
                    position: { ...transform.position },
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

                // Magazine Explosion Chance (Test 115)
                if (sub.type === SubsystemType.Combat && sub.hp <= 0) {
                    if (world.random.next() < 0.2) { // 20% chance on destruction
                        logger.warn(`MAGAZINE EXPLOSION on ${cmd.entityId}!`);
                        world.queueExternalCommand(new ApplyDamageCommand(cmd.entityId, 5000));
                        world.events.emit({
                            type: 'Detonation',
                            tick: world.currentTick,
                            entityId: cmd.entityId,
                            data: { position: { x: 0, y: 0, z: 0 }, radius: 50, damage: 5000 }
                        });
                    }
                }
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

import { World } from './World.js';
import { EntityId, Side, SensorType, EMBand, SensorMode, MountingType, MissionType } from './Types.js';
import { Entity } from './Entity.js';
import { EntityManager } from './EntityManager.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { CombatComponent, SalvoComponent } from '../components/Combat.js';
import { WeaponStageComponent, WeaponStage as CompWeaponStage } from '../components/WeaponStages.js';
import { CollisionComponent } from '../components/Collision.js';
import { GuidanceComponent, GuidanceType as CompGuidanceType } from '../components/Guidance.js';
import { GuidanceType as ProfGuidanceType, type WeaponProfile } from './WeaponProfileRegistry.js';
import { SensorComponent, DetectionComponent } from '../components/Sensors.js';
import { PropulsionComponent } from '../components/Propulsion.js';
import { MissionComponent, MissionStatus } from '../components/Missions.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { FireControl } from '../math/FireControl.js';
import { VectorMath } from '../math/VectorMath.js';
import { logger } from './Logger.js';

/**
 * MunitionFactory: Specialized factory for spawning weapons (Missiles, Shells, Torpedoes).
 * Consolidates complex spawning logic from CommandHandlers.
 */
export class MunitionFactory {
    public static spawnMunition(
        world: World,
        shooterId: EntityId,
        targetId: EntityId,
        weaponProfile: WeaponProfile,
        mountName: string
    ): Entity | undefined {
        const shooter = world.getEntity(shooterId);
        const target = world.getEntity(targetId);
        if (!shooter || !target || !weaponProfile) return undefined;

        const shooterTransform = shooter.getComponent(TransformComponent);
        const targetTransform = target.getComponent(TransformComponent);
        if (!shooterTransform || !targetTransform) return undefined;

        const entityMgr = new EntityManager(world, world.profileRegistry);
        const munitionId = `${shooterId}-${weaponProfile.id}-${world.timestamp.toFixed(3)}-${world.random.integer(0, 9999)}`;
        const projectileProfileId = weaponProfile.entityProfileId || `${weaponProfile.id}-projectile`;

        // Calculate ballistic solution
        const shooterVel = shooter.getComponent(KinematicsComponent)?.velocity || { x: 0, y: 0, z: 0 };
        const targetVel = target.getComponent(KinematicsComponent)?.velocity || { x: 0, y: 0, z: 0 };
        const env = shooter.getComponent(EnvironmentComponent) as EnvironmentComponent;
        const projectileProfile = world.profileRegistry.get(projectileProfileId);

        const solution = FireControl.calculateAdvancedBallisticSolution(
            shooterTransform.position,
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
            azimuthDeg: (Math.atan2(targetTransform.position.y - shooterTransform.position.y, targetTransform.position.x - shooterTransform.position.x) * (180 / Math.PI) + 360) % 360,
            elevationDeg: 0
        };

        const isVLS = mountName.toLowerCase().includes('vls') || weaponProfile.id.toLowerCase().includes('vls');
        const launchPitch = isVLS ? 85 : solution.elevationDeg;
        const launchHdg = solution.azimuthDeg;

        const munition = entityMgr.spawn({
            id: munitionId,
            profileId: projectileProfileId,
            pos: [
                shooterTransform.position.x + (world.random.next() - 0.5) * 5,
                shooterTransform.position.y + (world.random.next() - 0.5) * 5,
                shooterTransform.position.z + 2
            ],
            heading: launchHdg,
            pitch: launchPitch,
            speedKts: weaponProfile.cruiseSpeedKts,
            side: shooter.side
        });

        const col = munition.getComponent(CollisionComponent);
        if (col) col.ownerId = shooterId;

        if (weaponProfile.type === 'Missile') {
            this.setupMissile(world, munition, shooterId, targetId, weaponProfile);
        }

        return munition;
    }

    public static spawnSalvo(
        world: World,
        shooterId: EntityId,
        targetId: EntityId,
        weaponProfile: WeaponProfile,
        mountName: string,
        quantity: number
    ): Entity | undefined {
        const shooter = world.getEntity(shooterId);
        const target = world.getEntity(targetId);
        if (!shooter || !target || !weaponProfile) return undefined;

        const shooterTransform = shooter.getComponent(TransformComponent);
        const targetTransform = target.getComponent(TransformComponent);
        if (!shooterTransform || !targetTransform) return undefined;

        const entityMgr = new EntityManager(world, world.profileRegistry);
        const munitionId = `${shooterId}-${weaponProfile.id}-salvo-${world.currentTick}-${world.random.integer(0, 9999)}`;
        const projectileProfileId = weaponProfile.entityProfileId || `${weaponProfile.id}-projectile`;

        // Calculate ballistic solution
        const shooterVel = shooter.getComponent(KinematicsComponent)?.velocity || { x: 0, y: 0, z: 0 };
        const targetVel = target.getComponent(KinematicsComponent)?.velocity || { x: 0, y: 0, z: 0 };
        const env = shooter.getComponent(EnvironmentComponent) as EnvironmentComponent;
        const projectileProfile = world.profileRegistry.get(projectileProfileId);

        const solution = FireControl.calculateAdvancedBallisticSolution(
            shooterTransform.position,
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
            azimuthDeg: (Math.atan2(targetTransform.position.y - shooterTransform.position.y, targetTransform.position.x - shooterTransform.position.x) * (180 / Math.PI) + 360) % 360,
            elevationDeg: Math.atan2(targetTransform.position.z - shooterTransform.position.z, VectorMath.distance({ ...shooterTransform.position, z: 0 }, { ...targetTransform.position, z: 0 })) * (180 / Math.PI)
        };

        const munition = entityMgr.spawn({
            id: munitionId,
            profileId: projectileProfileId,
            pos: [
                shooterTransform.position.x,
                shooterTransform.position.y,
                shooterTransform.position.z + 2
            ],
            heading: solution.azimuthDeg,
            pitch: solution.elevationDeg,
            speedKts: weaponProfile.cruiseSpeedKts,
            side: shooter.side
        });

        // Add SalvoComponent to track quantity
        munition.addComponent(new SalvoComponent({
            quantity,
            initialQuantity: quantity,
            dispersionDeg: weaponProfile.burst?.dispersionDeg || 0.1
        }));

        const col = munition.getComponent(CollisionComponent);
        if (col) col.ownerId = shooterId;

        logger.info(`Salvo entity spawned: ${munitionId}`, { target: targetId, qty: quantity });
        return munition;
    }

    private static setupMissile(
        world: World,
        munition: Entity,
        shooterId: EntityId,
        targetId: EntityId,
        weaponProfile: WeaponProfile
    ) {
        const prop = munition.getComponent(PropulsionComponent);
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

        munition.addComponent(new GuidanceComponent({
            guidanceType: compGuidanceType as any,
            targetId,
            illuminatorId: compGuidanceType === CompGuidanceType.SARH ? shooterId : undefined
        }));

        munition.addComponent(new MissionComponent({
            missionType: MissionType.Intercept,
            params: { targetId },
            status: MissionStatus.Active,
            startTimeTick: world.currentTick
        }));

        // If ARH, ensure it has a seeker sensor
        if (compGuidanceType === CompGuidanceType.ARH) {
            if (!munition.getComponent(SensorComponent)) {
                munition.addComponent(new SensorComponent({
                    sensorType: SensorType.Radar,
                    maxRangeM: 20000,
                    isActive: true,
                    beamWidthDeg: 45,
                    band: EMBand.X,
                    mode: SensorMode.Search,
                    mounting: MountingType.Fixed,
                    name: 'Seeker'
                }));
            }
            if (!munition.getComponent(DetectionComponent)) {
                munition.addComponent(new DetectionComponent());
            }
        }
        logger.info(`Weapon entity spawned: ${munition.id}`, { target: targetId, guidance: compGuidanceType });
    }
}

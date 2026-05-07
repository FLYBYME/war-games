import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, ApplyDamageCommand, DestroyEntityCommand } from '../core/Command.js';
import { TransformComponent, KinematicsComponent } from '../components/Physics.js';
import { CollisionComponent } from '../components/Collision.js';
import { EnvironmentComponent } from '../components/Environment.js';
import { LogisticsComponent, TurnaroundState } from '../components/Logistics.js';
import { BallisticBurstComponent } from '../components/Ballistics.js';
import { SalvoComponent } from '../components/Combat.js';
import { Octree } from '../core/Octree.js';
import { Vector3 } from '../core/Types.js';
import { VectorMath } from '../math/VectorMath.js';
import { logger } from '../core/Logger.js';
import { ProfileRegistry } from '../core/ProfileRegistry.js';

/**
 * CollisionSystem: Detects physical intersections between entities and terrain.
 */
export class CollisionSystem implements ISystem {
    readonly name = 'CollisionSystem';
    readonly phase = SystemPhase.Lifecycle;
    readonly dependencies = [];

    constructor(private readonly spatialGrid: Octree) { }

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];
        const entities = world.getEntities();
        const checkedPairs = new Set<string>();
        const profileRegistry = world.profileRegistry as ProfileRegistry;

        for (const entity of entities) {
            const transform = entity.getComponent(TransformComponent);
            const collision = entity.getComponent(CollisionComponent);

            if (!transform || !collision) continue;

            let isDestroyed = false;

            // 1. Entity-Entity Collisions
            const nearbyIds = this.spatialGrid.getNearbyEntities(transform.position, collision.radiusMeters * 5);

            for (const otherId of nearbyIds) {
                if (entity.id === otherId) continue;

                const otherEntity = world.getEntity(otherId);
                if (!otherEntity) continue;

                const otherCollision = otherEntity.getComponent(CollisionComponent);
                if (!otherCollision) continue;

                // Ignore collisions if hosted on the same carrier OR if just launched (one tick grace)
                const logA = entity.getComponent(LogisticsComponent);
                const logB = otherEntity.getComponent(LogisticsComponent);

                const isRecentlyLaunchedA = logA?.state === TurnaroundState.InFlight && (world.currentTick - (logA?.stateStartTick || 0)) < 100;
                const isRecentlyLaunchedB = logB?.state === TurnaroundState.InFlight && (world.currentTick - (logB?.stateStartTick || 0)) < 100;

                if (isRecentlyLaunchedA && (otherId === logA?.lastBaseId)) continue;
                if (isRecentlyLaunchedB && (entity.id === logB?.lastBaseId)) continue;

                if (logA?.currentBaseId && (logA.currentBaseId === otherId || logA.currentBaseId === logB?.currentBaseId)) continue;
                if (logB?.currentBaseId && (logB.currentBaseId === entity.id)) continue;

                // Self-collision ignore (two-way) and sibling ignore
                if (collision.ownerId === otherId || otherCollision.ownerId === entity.id ||
                    (collision.ownerId && collision.ownerId === otherCollision.ownerId)) continue;

                // Ensure we don't check the same pair twice
                const pairKey = [entity.id, otherId].sort().join(':');
                if (checkedPairs.has(pairKey)) continue;
                checkedPairs.add(pairKey);

                const otherTransform = otherEntity.getComponent(TransformComponent);
                if (!otherTransform) continue;

                // 2. Layer Filtering
                if (!collision.collidesWith.includes(otherCollision.layer) &&
                    !otherCollision.collidesWith.includes(collision.layer)) {
                    continue;
                }

                // 3. Mathematical Intersection
                let hasCollided = false;

                const kinematics = entity.getComponent(KinematicsComponent);
                const burst = entity.getComponent(BallisticBurstComponent);

                if (burst) {
                    // Statistical Burst Intersection (CIWS stream)
                    hasCollided = this.calculateBurstCollision(burst, transform.position, otherTransform.position, otherCollision.radiusMeters, _dt);
                } else if (entity.getComponent(SalvoComponent)) {
                    const salvo = entity.getComponent(SalvoComponent)!;
                    const hits = this.calculateSalvoHits(salvo, transform.position, otherTransform.position, otherCollision.radiusMeters);
                    if (hits > 0) {
                        logger.info(`Salvo hit: ${entity.id} -> ${otherId} | Hits: ${hits}/${salvo.quantity}`);
                        // Apply damage for all hits
                        const targetProfile = otherEntity.profileId ? profileRegistry.get(otherEntity.profileId) : undefined;
                        const damagePerHit = (targetProfile as { damage?: number } | undefined)?.damage || 20;
                        commands.push(new ApplyDamageCommand(otherId, hits * damagePerHit));

                        // Salvo is partially or fully consumed? 
                        // For now, we destroy the salvo entity on any hit to simplify, 
                        // or we could decrement quantity. Let's destroy for now as it represents a 'snapshot' of fire.
                        commands.push(new DestroyEntityCommand(entity.id));
                        isDestroyed = true;
                        hasCollided = false; // We handled it manually
                        break;
                    }
                } else {
                    const minDistance = collision.radiusMeters + otherCollision.radiusMeters;

                    if (kinematics && VectorMath.magnitude(kinematics.velocity) > 500) {
                        // Continuous Collision Detection (CCD) for high-velocity shells/missiles
                        const prevPos = VectorMath.subtract(transform.position, VectorMath.multiplyScalar(kinematics.velocity, _dt));
                        const closest = VectorMath.closestPointOnSegment(otherTransform.position, prevPos, transform.position);
                        const distToClosestSq = VectorMath.distanceSq(closest, otherTransform.position);

                        // Proximity Fuse: If missile (layer 'missile') and target is Air, expand hit radius to 15m
                        const isMissile = collision.layer === 'missile';
                        const otherProfile = otherEntity.profileId ? profileRegistry.get(otherEntity.profileId) : undefined;
                        const isAirTarget = otherProfile?.type === 'Aircraft' || otherProfile?.type === 'Helicopter';

                        const effectiveMinDist = (isMissile && isAirTarget) ? Math.max(minDistance, 15) : minDistance;
                        hasCollided = distToClosestSq <= effectiveMinDist * effectiveMinDist;
                    } else {
                        // Discrete Sphere-Sphere Intersection
                        const distSq = VectorMath.distanceSq(transform.position, otherTransform.position);
                        hasCollided = distSq <= minDistance * minDistance;
                    }
                }

                if (hasCollided) {
                    logger.info(`Collision detected: ${entity.id} <-> ${otherId}`);
                    this.handleCollision(entity.id, collision, otherId, otherCollision, commands);
                    isDestroyed = true;
                    break;
                }
            }

            if (isDestroyed) continue;

            // 2. Terrain/Surface Collision (Impact)
            const env = entity.getComponent(EnvironmentComponent);
            const profile = entity.profileId ? profileRegistry.get(entity.profileId) : undefined;

            // Identify Air Entities: Aircraft, Helos, and non-torpedo Weapons
            const isAirEntity = profile?.type === 'Aircraft' ||
                profile?.type === 'Helicopter' ||
                (profile?.type === 'Weapon' && !entity.id.includes('torpedo'));

            if (env && isAirEntity) {
                const logistics = entity.getComponent(LogisticsComponent);
                const isHosted = logistics && logistics.currentBaseId && logistics.state !== TurnaroundState.InFlight;

                // If altitude drops below threshold (0.1m above sea level/terrain)
                const surfaceAlt = Math.max(0, env.terrainHeightM);
                if (transform.position.z <= surfaceAlt + 0.1) {
                    // Check if landing or hosted (legitimate surface contact)
                    const isLanding = logistics && logistics.state === TurnaroundState.Landing;

                    if (!isLanding && !isHosted) {
                        logger.debug(`Surface impact check: ${entity.id} z=${transform.position.z.toFixed(2)} alt=${surfaceAlt.toFixed(2)} isHosted=${isHosted} baseId=${logistics?.currentBaseId} state=${logistics?.state}`);
                        commands.push(new DestroyEntityCommand(entity.id));
                        world.recordEvent({
                            type: 'Impact',
                            tick: world.currentTick,
                            entityId: entity.id,
                            data: {
                                targetId: 'TERRAIN',
                                position: { ...transform.position, z: surfaceAlt } // Clamp for log
                            }
                        });
                        logger.info(`Surface impact: ${entity.id} hit surface at ${transform.position.z.toFixed(2)}m`);
                        continue;
                    }
                }
            }
        }

        return commands;
    }

    private calculateSalvoHits(salvo: SalvoComponent, salvoPos: Vector3, targetPos: Vector3, targetRadius: number): number {
        const dist = VectorMath.distance(salvoPos, targetPos);
        if (dist > 5000) return 0; // Max effective range for burst

        const targetArea = Math.PI * targetRadius * targetRadius;
        const dispersionRadius = dist * Math.tan(salvo.dispersionDeg * (Math.PI / 180));
        const dispersionArea = Math.PI * Math.max(0.5, dispersionRadius * dispersionRadius);

        const hitProb = Math.min(0.8, targetArea / dispersionArea); // Cap at 80% for realism

        // Stochastic hit count
        let hits = 0;
        const n = salvo.quantity;
        if (n < 20) {
            for (let i = 0; i < n; i++) {
                if (Math.random() < hitProb) hits++;
            }
        } else {
            // Normal approximation for large N: mean = np, std = sqrt(np(1-p))
            const mean = n * hitProb;
            const std = Math.sqrt(n * hitProb * (1 - hitProb));
            // Box-Muller transform for normal distribution
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            hits = Math.max(0, Math.min(n, Math.round(mean + z0 * std)));
        }
        return hits;
    }

    private calculateBurstCollision(burst: BallisticBurstComponent, burstPos: Vector3, targetPos: Vector3, targetRadius: number, dt: number): boolean {
        const vToTarget = VectorMath.subtract(targetPos, burstPos);
        const dist = VectorMath.magnitude(vToTarget);

        // Check if target is within the burst cone
        const uToTarget = VectorMath.normalize(vToTarget);
        const uBurst = VectorMath.normalize(burst.muzzleVelocity);
        const cosTheta = VectorMath.dot(uToTarget, uBurst);
        const angleDeg = Math.acos(Math.max(-1, Math.min(1, cosTheta))) * (180 / Math.PI);

        if (angleDeg > burst.dispersionDeg * 2) return false;

        // Statistical Hit Probability
        const targetArea = Math.PI * targetRadius * targetRadius;
        const burstRadius = dist * Math.tan(burst.dispersionDeg * (Math.PI / 180));
        const burstArea = Math.PI * burstRadius * burstRadius;

        const roundsInTick = burst.roundsPerSecond * dt;
        const hitProb = (targetArea / Math.max(1, burstArea)) * roundsInTick;

        return Math.random() < hitProb;
    }

    private handleCollision(
        idA: string, colA: CollisionComponent,
        idB: string, colB: CollisionComponent,
        commands: Command[]
    ): void {
        // High-velocity impact (Missiles)
        if (colA.layer === 'missile' || colB.layer === 'missile') {
            const victimId = colA.layer === 'missile' ? idB : idA;
            const missileId = colA.layer === 'missile' ? idA : idB;

            commands.push(new ApplyDamageCommand(victimId, 500)); // Massive damage
            commands.push(new DestroyEntityCommand(missileId));
            return;
        }

        // Generic collision
        commands.push(new ApplyDamageCommand(idA, 50));
        commands.push(new ApplyDamageCommand(idB, 50));
    }
}

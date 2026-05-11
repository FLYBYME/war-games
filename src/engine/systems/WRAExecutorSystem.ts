import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, FireWeaponCommand, FireSalvoCommand } from '../core/Command.js';
import { DoctrineComponent } from '../components/Doctrine.js';
import { IdentificationStatus, ROE } from '../core/Types.js';
import { CombatComponent } from '../components/Combat.js';
import { TrackComponent } from '../components/Track.js';
import { TransformComponent } from '../components/Physics.js';
import { WeaponProfileRegistry } from '../core/WeaponProfileRegistry.js';
import { VectorMath } from '../math/VectorMath.js';
import { logger } from '../core/Logger.js';
import { GuidanceComponent } from '../components/Guidance.js';
import { CollisionComponent } from '../components/Collision.js';

/**
 * WRAExecutorSystem: Evaluates WRA rules and triggers automated engagements.
 */
export class WRAExecutorSystem implements ISystem {
    readonly name = 'WRAExecutorSystem';
    readonly phase = SystemPhase.Doctrine;
    readonly dependencies = ['SensorSystem', 'TMSSystem', 'DoctrineSystem'];

    constructor(private weaponProfiles: WeaponProfileRegistry) { }

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        const commands: Command[] = [];

        for (const entity of world.getEntities()) {
            const doctrine = entity.getComponent(DoctrineComponent) as DoctrineComponent;
            const combat = entity.getComponent(CombatComponent);
            const tracks = entity.getComponent(TrackComponent);
            const transform = entity.getComponent(TransformComponent);

            if (!doctrine || !combat || !tracks || !transform) continue;

            // 1. ROE Check
            if (doctrine.roe === ROE.HOLD) continue;

            const usedMounts = new Set<number>();

            // 1.5 Prioritize Tracks (Test 79)
            const sortedTracks = Array.from(tracks.tracks.values()).sort((a, b) => {
                const isWpnA = a.classification === 'Weapon';
                const isWpnB = b.classification === 'Weapon';
                
                if (isWpnA && !isWpnB) return -1;
                if (!isWpnA && isWpnB) return 1;

                if (isWpnA && isWpnB) {
                    const distA = VectorMath.distance(transform.position, a.position);
                    const distB = VectorMath.distance(transform.position, b.position);
                    const uA = VectorMath.normalize(VectorMath.subtract(a.position, transform.position));
                    const vRelA = VectorMath.dot(a.velocity, uA);
                    const uB = VectorMath.normalize(VectorMath.subtract(b.position, transform.position));
                    const vRelB = VectorMath.dot(b.velocity, uB);
                    const ttiA = vRelA < -1 ? distA / Math.abs(vRelA) : 9999;
                    const ttiB = vRelB < -1 ? distB / Math.abs(vRelB) : 9999;
                    return ttiA - ttiB;
                }
                return VectorMath.distance(transform.position, a.position) - VectorMath.distance(transform.position, b.position);
            });

            for (const track of sortedTracks) {
                // Identification Check
                let isHostile = false;
                if (doctrine.roe === ROE.FREE) {
                    isHostile = track.identification !== IdentificationStatus.FRIENDLY;
                } else {
                    isHostile = track.identification === IdentificationStatus.HOSTILE;
                }

                if (!isHostile) continue;
                if (track.trueEntityId === entity.id) continue; // Don't target yourself
                
                // Extra safety: don't target same side
                const targetEntity = world.getEntity(track.trueEntityId);
                if (targetEntity && targetEntity.side === entity.side) continue;

                // 2. WRA Rule Matching
                const targetType = track.classification || 'Unknown';
                const dist = VectorMath.distance(transform.position, track.position);

                let rulesToEvaluate = doctrine.wraRules.filter(r => r.targetType === 'Any' || r.targetType === targetType);

                // Fallback to a default rule if no specific rules are defined (Test 78)
                if (rulesToEvaluate.length === 0 && doctrine.wraRules.length === 0) {
                    const defaultRule = targetType === 'Weapon' ? 
                        { targetType: 'Any', weaponType: 'Any', quantity: 1, maxRangePct: 0.2 } : // CIWS range
                        { targetType: 'Any', weaponType: 'Any', quantity: 1, maxRangePct: 0.75 };
                    rulesToEvaluate = [defaultRule];
                }

                for (const rule of rulesToEvaluate) {
                    // 3. Find suitable mount with matching weapon
                    for (let i = 0; i < combat.mounts.length; i++) {
                        if (usedMounts.has(i)) continue;
                        const mount = combat.mounts[i];
                        if (!mount || !mount.magazineIndices) continue;
                        const magIdx = mount.magazineIndices[mount.activeMagazineIndex];

                        if (magIdx === undefined) continue;

                        const magazine = combat.magazines[magIdx];
                        if (!magazine || magazine.currentCount <= 0) continue;

                        const weaponProfile = this.weaponProfiles.get(magazine.weaponProfileId);
                        if (!weaponProfile) continue;

                        // Match Weapon Type
                        const ruleWpn = rule.weaponType.toLowerCase();
                        const targetWpn = weaponProfile.id.toLowerCase();
                        const targetWpnName = weaponProfile.name.toLowerCase();

                        if (ruleWpn !== 'any' && ruleWpn !== targetWpn && ruleWpn !== targetWpnName) {
                            continue;
                        }

                        // 4. Range Check
                        const shooterAlt = transform.position.z;
                        const maxRange = WeaponProfileRegistry.getEffectiveMaxRange(weaponProfile, shooterAlt);
                        const minRange = rule.minRangeM || weaponProfile.minRangeM || 0;
                        const maxRangePct = rule.maxRangePct !== undefined ? rule.maxRangePct : 1.0;
                        const maxEffectiveRange = maxRange * maxRangePct;

                        if (dist >= minRange && dist <= maxEffectiveRange) {
                            // 5. Arc Check (Test 65)
                            // azimuthDegWorld is calculated above
                            const vToTarget = VectorMath.subtract(track.position, transform.position);
                            const azimuthDegWorld = (Math.atan2(vToTarget.y, vToTarget.x) * (180 / Math.PI) + 360) % 360;
                            const groundDist = Math.sqrt(vToTarget.x * vToTarget.x + vToTarget.y * vToTarget.y);
                            const elevationDegWorld = Math.atan2(vToTarget.z, groundDist) * (180 / Math.PI);

                            // Transform to body frame
                            let relativeAz = azimuthDegWorld - transform.rotation;
                            while (relativeAz > 180) relativeAz -= 360;
                            while (relativeAz < -180) relativeAz += 360;
                            const relativeEl = elevationDegWorld - transform.pitch;

                            // Check if within mount arcs
                            const isInAzArc = mount.minAzimuth === undefined || mount.maxAzimuth === undefined || 
                                (mount.minAzimuth < mount.maxAzimuth ? 
                                    (relativeAz >= mount.minAzimuth && relativeAz <= mount.maxAzimuth) : 
                                    (relativeAz >= mount.minAzimuth || relativeAz <= mount.maxAzimuth));
                            
                            const isInElArc = mount.minElevation === undefined || mount.maxElevation === undefined ||
                                (relativeEl >= mount.minElevation && relativeEl <= mount.maxElevation);

                            if (!isInAzArc || !isInElArc) continue;

                            // 6. Alignment Check
                            let azDiff = relativeAz - (mount.currentAzimuth || 0);
                            while (azDiff > 180) azDiff -= 360;
                            while (azDiff < -180) azDiff += 360;
                            azDiff = Math.abs(azDiff);

                            const elDiff = Math.abs(relativeEl - (mount.currentElevation || 0));
                            const threshold = mount.alignmentThresholdDeg ?? 1.0;
                            const isAligned = azDiff < threshold && elDiff < threshold;

                            // Always set the target so CombatSystem slews the mount
                            mount.currentTargetId = track.trueEntityId;

                            if (!isAligned && mount.slewRate > 0) {
                                usedMounts.add(i); // Still "using" this mount for this tick
                                continue;
                            }

                            // Verify true entity still exists before continuing
                            if (!world.getEntity(track.trueEntityId)) {
                                logger.debug(`WRAExecutorSystem skipping engagement: true entity ${track.trueEntityId} for track ${track.id} no longer exists.`);
                                continue;
                            }

                            // 7. Salvo/Quantity Check (Prevent Over-Engagement)
                            // We need to account for what we've ALREADY commanded this tick
                            const commandedThisTick = commands.filter(c => 
                                (c instanceof FireWeaponCommand || c instanceof FireSalvoCommand) && 
                                c.targetId === track.trueEntityId
                            ).reduce((sum, c) => sum + (c instanceof FireSalvoCommand ? c.quantity : 1), 0);

                            const inFlightCount = [...world.getEntities()].filter(e => {
                                const g = e.getComponent(GuidanceComponent) as GuidanceComponent;
                                const isProjectile = e.profileId?.includes('projectile') || e.profileId?.includes('shell');
                                const col = e.getComponent(CollisionComponent);
                                
                                // Count if it's guided towards target OR if it's an unguided shell from us
                                return (g && g.targetId === track.trueEntityId) || 
                                       (isProjectile && col?.ownerId === entity.id);
                            }).length + commandedThisTick;

                            const requiredQty = rule.quantity !== undefined ? rule.quantity : 1;
                            
                            if (inFlightCount >= requiredQty) continue; 

                            // 8. Check Reload & Fire
                            const reloadElapsed = world.currentTick - mount.lastFireTick;
                            if (reloadElapsed >= mount.reloadTicks) {
                                let firingQty = Math.min(magazine.currentCount, requiredQty - inFlightCount);
                                
                                if (firingQty > 0) {
                                    logger.info(`WRA triggering engagement: ${entity.id} -> ${track.id} [${track.classification}]`, { weapon: magazine.weaponProfileId, dist: Math.round(dist), qty: firingQty });

                                    if (weaponProfile.type === 'Gun' && firingQty > 1) {
                                        commands.push(new FireSalvoCommand(entity.id, i, track.trueEntityId, firingQty));
                                    } else {
                                        // For missiles, usually fire 1 per tick or per mount
                                        const count = weaponProfile.type === 'Missile' ? 1 : firingQty;
                                        for (let s = 0; s < count; s++) {
                                            commands.push(new FireWeaponCommand(entity.id, i, track.trueEntityId));
                                        }
                                    }
                                    usedMounts.add(i);
                                    
                                    // If we still need more rounds, DON'T break, let the next mount try
                                    const totalNow = inFlightCount + (weaponProfile.type === 'Missile' ? 1 : firingQty);
                                    if (totalNow >= requiredQty) break; 
                                }
                            }
                        }
                    }
                }
            }
        }

        return commands;
    }
}

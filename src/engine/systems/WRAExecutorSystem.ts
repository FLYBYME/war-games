import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command, FireWeaponCommand, FireSalvoCommand } from '../core/Command.js';
import { DoctrineComponent, ROE } from '../components/Doctrine.js';
import { IdentificationStatus } from '../core/Types.js';
import { CombatComponent } from '../components/Combat.js';
import { TrackComponent } from '../components/Track.js';
import { TransformComponent } from '../components/Physics.js';
import { WeaponProfileRegistry } from '../core/WeaponProfileRegistry.js';
import { VectorMath } from '../math/VectorMath.js';
import { logger } from '../core/Logger.js';
import { GuidanceComponent } from '../components/Guidance.js';

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

            for (const track of tracks.tracks.values()) {
                // Identification Check
                let isHostile = false;
                if (doctrine.roe === ROE.FREE) {
                    isHostile = track.identification !== IdentificationStatus.FRIENDLY;
                } else {
                    isHostile = track.identification === IdentificationStatus.HOSTILE;
                }

                if (!isHostile) continue;

                // 2. WRA Rule Matching
                const targetType = track.classification || 'Unknown';
                const dist = VectorMath.distance(transform.position, track.position);

                let rulesToEvaluate = doctrine.wraRules.filter(r => r.targetType === 'Any' || r.targetType === targetType);

                // Fallback to a default rule if no specific rules are defined
                if (rulesToEvaluate.length === 0 && doctrine.wraRules.length === 0) {
                    rulesToEvaluate = [{ targetType: 'Any', weaponType: 'Any', quantity: 1, maxRangePct: 0.75 }];
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
                            // 5. Alignment Check
                            // We need to ensure the mount is pointed at the target before firing
                            
                            // Calculate required angles
                            const vToTarget = VectorMath.subtract(track.position, transform.position);
                            const azimuthDegWorld = (Math.atan2(vToTarget.y, vToTarget.x) * (180 / Math.PI) + 360) % 360;
                            const groundDist = Math.sqrt(vToTarget.x * vToTarget.x + vToTarget.y * vToTarget.y);
                            const elevationDegWorld = Math.atan2(vToTarget.z, groundDist) * (180 / Math.PI);

                            // Transform to body frame
                            let relativeAz = azimuthDegWorld - transform.rotation;
                            while (relativeAz > 180) relativeAz -= 360;
                            while (relativeAz < -180) relativeAz += 360;
                            const relativeEl = elevationDegWorld - transform.pitch;

                            // Check alignment
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

                            // 6. Salvo/Quantity Check (Prevent Over-Engagement)
                            const inFlightCount = [...world.getEntities()].filter(e => {
                                const g = e.getComponent(GuidanceComponent) as GuidanceComponent;
                                return g && g.targetId === track.trueEntityId;
                            }).length;

                            const requiredQty = rule.quantity !== undefined ? rule.quantity : 1;
                            
                            if (inFlightCount >= requiredQty) continue; 

                            // 6. Check Reload & Fire
                            const reloadElapsed = world.currentTick - mount.lastFireTick;
                            if (reloadElapsed >= mount.reloadTicks) {
                                const firingQty = Math.max(0, requiredQty - inFlightCount);
                                if (firingQty > 0) {
                                    logger.info(`WRA triggering engagement: ${entity.id} -> ${track.id} [${track.classification}]`, { weapon: magazine.weaponProfileId, dist: Math.round(dist), qty: firingQty });

                                    if (weaponProfile.type === 'Gun' && firingQty > 1) {
                                        commands.push(new FireSalvoCommand(entity.id, i, track.trueEntityId, firingQty));
                                    } else {
                                        for (let s = 0; s < firingQty; s++) {
                                            if (magazine.currentCount > 0) {
                                                commands.push(new FireWeaponCommand(entity.id, i, track.trueEntityId));
                                            }
                                        }
                                    }
                                    usedMounts.add(i);
                                    break; 
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

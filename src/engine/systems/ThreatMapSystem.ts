import { ISystem, IWorldView, SystemPhase } from '../core/ISystem.js';
import { Command } from '../core/Command.js';
import { Side, Vector3 } from '../core/Types.js';
import { CombatComponent } from '../components/Combat.js';
import { TransformComponent } from '../components/Physics.js';
import { WeaponProfileRegistry } from '../core/WeaponProfileRegistry.js';

export interface ThreatZone {
    center: Vector3;
    radiusM: number;
    intensity: number; // 0 to 1
    side: Side;
}

/**
 * ThreatMapSystem: Periodically calculates the side-specific threat landscape.
 */
export class ThreatMapSystem implements ISystem {
    readonly name = 'ThreatMapSystem';
    readonly phase = SystemPhase.Environment;
    readonly dependencies = [];

    public threatZones = new Map<Side, ThreatZone[]>();

    constructor(private weaponProfiles: WeaponProfileRegistry) {}

    public async process(world: IWorldView, _dt: number): Promise<Command[]> {
        // Run every 10 ticks (1s) to save perf
        if (world.currentTick % 10 !== 0) return [];

        const sides = [Side.Blue, Side.Red];
        sides.forEach(side => {
            const zones: ThreatZone[] = [];
            const enemySide = side === Side.Blue ? Side.Red : Side.Blue;

            for (const entity of world.getEntities()) {
                if (entity.side === enemySide) {
                    const combat = entity.getComponent(CombatComponent);
                    const transform = entity.getComponent(TransformComponent);
                    
                    if (combat && transform) {
                        // Find max weapon range
                        let maxRange = 0;
                        combat.magazines.forEach(mag => {
                            const p = this.weaponProfiles.get(mag.weaponProfileId);
                            if (p && p.maxRangeM > maxRange) maxRange = p.maxRangeM;
                        });

                        if (maxRange > 0) {
                            zones.push({
                                center: transform.position,
                                radiusM: maxRange,
                                intensity: 1.0,
                                side: enemySide
                            });
                        }
                    }
                }
            }
            this.threatZones.set(side, zones);
        });

        return [];
    }

    public getThreatAt(pos: Vector3, side: Side): number {
        const zones = this.threatZones.get(side) || [];
        let totalThreat = 0;
        for (const zone of zones) {
            const dx = pos.x - zone.center.x;
            const dy = pos.y - zone.center.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < zone.radiusM * zone.radiusM) {
                totalThreat += zone.intensity;
            }
        }
        return totalThreat;
    }
}

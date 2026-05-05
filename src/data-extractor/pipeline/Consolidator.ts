import { EntityProfile } from '../../sdk/schemas/index.js';

export interface BasePlatform {
    platformClass: string;
    type: string;
    kinematics: any;
    aero?: any;
    signatures: any;
    variants: Record<string, VariantDiff>;
}

export interface VariantDiff {
    variantName: string;
    propulsion?: any; // Engines change between blocks
    sensors?: any[];  // Radars change between blocks
}

/**
 * Consolidator: Groups variants of the same platform together.
 * Optimizes memory by identifying shared traits (hulls, wings) across blocks.
 */
export class Consolidator {
    public static groupAndDiff(profiles: EntityProfile[]): BasePlatform[] {
        const grouped = new Map<string, EntityProfile[]>();

        // Group by platformClass (e.g., "F-16 Fighting Falcon")
        for (const p of profiles) {
            const key = p.platformClass || 'Unknown Class';
            const list = grouped.get(key) || [];
            list.push(p);
            grouped.set(key, list);
        }

        const db: BasePlatform[] = [];

        for (const [platformClass, variants] of grouped.entries()) {
            // Assume the first variant's physical hull is the "Base"
            const base = variants[0];
            
            const platform: BasePlatform = {
                platformClass: platformClass,
                type: base.type || 'Unknown',
                kinematics: base.kinematics, // Shared hull mass
                aero: base.aero,             // Shared wing area
                signatures: base.signatures, // Shared RCS
                variants: {}
            };

            for (const v of variants) {
                const vName = v.variantName || 'Unknown Variant';
                platform.variants[vName] = {
                    variantName: vName,
                    propulsion: v.propulsion,
                    sensors: v.sensors
                };
            }

            db.push(platform);
        }

        return db;
    }
}

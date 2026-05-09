import { z } from 'zod';
import { GuidanceType, WarheadType, WeaponProfileSchema } from './Types.js';
import type { WeaponProfile } from './Types.js';
export { GuidanceType, WarheadType };
export type { WeaponProfile };

export class WeaponProfileRegistry {
    private profiles = new Map<string, WeaponProfile>();

    public register(id: string, input: z.input<typeof WeaponProfileSchema>): void {
        const profile = WeaponProfileSchema.parse(input);
        this.profiles.set(id, profile);
    }

    public get(id: string): WeaponProfile | undefined {
        return this.profiles.get(id);
    }

    public list(): WeaponProfile[] {
        return Array.from(this.profiles.values());
    }

    public getInternalMap(): Map<string, WeaponProfile> {
        return this.profiles;
    }

    /**
     * getEffectiveMaxRange: Calculates Rmax based on aerodynamic modifiers.
     */
    public static getEffectiveMaxRange(profile: WeaponProfile, shooterAlt: number): number {
        // Simple linear bonus for now: Rmax increases with altitude
        // In a pro sim, this would be a more complex spline or lookup table.
        const altBonus = Math.max(0, shooterAlt) * (profile.altitudeRmaxBonus ?? 0);
        return profile.maxRangeM + altBonus;
    }
}

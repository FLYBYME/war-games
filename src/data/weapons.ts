import { WeaponProfile, GuidanceType, WarheadType } from "../sdk/schemas/profiles.js";

/**
 * Weapon Performance Profiles: Guidance, Range, and Lethality.
 */
export const weaponProfiles: WeaponProfile[] = [
    {
        id: 'aim-120', name: 'AMRAAM', type: 'Missile',
        maxRangeM: 120000, minRangeM: 1000, maxSpeedKts: 3000, cruiseSpeedKts: 2200,
        guidance: GuidanceType.Active, pk: 0.85, warheadType: WarheadType.BlastFragmentation, altitudeRmaxBonus: 2.0,
        entityProfileId: 'aim-120-projectile'
    },
    {
        id: 'sm-6', name: 'Standard Missile 6', type: 'Missile',
        maxRangeM: 240000, minRangeM: 5000, maxSpeedKts: 2100, cruiseSpeedKts: 1500,
        guidance: GuidanceType.Active, pk: 0.9, warheadType: WarheadType.Kinetic, altitudeRmaxBonus: 1.5,
        entityProfileId: 'sm-6-projectile'
    },
    {
        id: 'harpoon', name: 'Harpoon SSM', type: 'Missile',
        maxRangeM: 140000, minRangeM: 5000, maxSpeedKts: 550, cruiseSpeedKts: 500,
        guidance: GuidanceType.Active, pk: 0.8, warheadType: WarheadType.BlastFragmentation,
        entityProfileId: 'harpoon-projectile'
    },
];

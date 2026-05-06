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
    {
        id: 'hq-16', name: 'HQ-16 SAM', type: 'Missile',
        maxRangeM: 40000, minRangeM: 1000, maxSpeedKts: 2800, cruiseSpeedKts: 2200,
        guidance: GuidanceType.SemiActive, pk: 0.75, warheadType: WarheadType.BlastFragmentation,
        entityProfileId: 'hq-16-projectile'
    },
    {
        id: 'c-802', name: 'C-802 SSM', type: 'Missile',
        maxRangeM: 120000, minRangeM: 5000, maxSpeedKts: 600, cruiseSpeedKts: 550,
        guidance: GuidanceType.Active, pk: 0.8, warheadType: WarheadType.BlastFragmentation,
        entityProfileId: 'c-802-projectile'
    },
    {
        id: '127mm-shell', name: '127mm Shell', type: 'Gun',
        maxRangeM: 24000, minRangeM: 0, maxSpeedKts: 1600, cruiseSpeedKts: 1600,
        guidance: GuidanceType.Ballistic, pk: 0.2, warheadType: WarheadType.BlastFragmentation,
        entityProfileId: '127mm-projectile'
    },
    {
        id: '76mm-shell', name: '76mm Shell', type: 'Gun',
        maxRangeM: 15000, minRangeM: 0, maxSpeedKts: 1800, cruiseSpeedKts: 1800,
        guidance: GuidanceType.Ballistic, pk: 0.15, warheadType: WarheadType.BlastFragmentation,
        entityProfileId: '76mm-projectile'
    },
    {
        id: '20mm-phalanx', name: '20mm Shell', type: 'Gun',
        maxRangeM: 3000, minRangeM: 0, maxSpeedKts: 2200, cruiseSpeedKts: 2200,
        guidance: GuidanceType.Ballistic, pk: 0.05, warheadType: WarheadType.Kinetic,
        entityProfileId: '20mm-projectile'
    }
];

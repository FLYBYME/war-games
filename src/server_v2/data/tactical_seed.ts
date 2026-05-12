import { EntityProfile, WeaponProfile, GuidanceType, ScenarioManifest, WarheadType } from '../../sdk_v2/contracts/index.js';

/**
 * Tactical Seed Data: Core platform and weapon profiles.
 * This file replaces the legacy 'dump' data and is tracked in version control.
 * IDs are matched to legacy test expectations to ensure continuity.
 */

export const profiles: Record<string, EntityProfile> = {
    'f-16c': {
        platformClass: 'F-16 Fighting Falcon',
        variantName: 'F-16C Block 50',
        type: 'Aircraft',
        kinematics: {
            massKg: 12000,
            maxSpeedKts: 1350,
            cruiseSpeedKts: 480,
            maxAltitudeM: 15000
        },
        signatures: { baseRCS: 5 }
    },
    'f-35a': {
        platformClass: 'F-35 Lightning II',
        variantName: 'F-35A',
        type: 'Aircraft',
        kinematics: {
            massKg: 13000,
            maxSpeedKts: 1200,
            cruiseSpeedKts: 520,
            maxAltitudeM: 18000
        },
        signatures: { baseRCS: 0.001 }
    },
    'fa-18-super-hornet': {
        platformClass: 'F/A-18 Super Hornet',
        type: 'Aircraft',
        kinematics: { massKg: 15000, maxSpeedKts: 1100, cruiseSpeedKts: 450 },
        signatures: { baseRCS: 1 }
    },
    'ddg-destroyer': {
        platformClass: 'Arleigh Burke',
        type: 'Ship',
        kinematics: { massKg: 9000000, maxSpeedKts: 32, cruiseSpeedKts: 20 },
        signatures: { baseRCS: 5000 }
    },
    'hostile-frigate': {
        platformClass: 'Type 054A',
        type: 'Ship',
        kinematics: { massKg: 4000000, maxSpeedKts: 28, cruiseSpeedKts: 18 },
        signatures: { baseRCS: 3000 }
    },
    'ford-class-carrier': {
        platformClass: 'Gerald R. Ford',
        type: 'Ship',
        kinematics: { massKg: 100000000, maxSpeedKts: 30, cruiseSpeedKts: 22 },
        signatures: { baseRCS: 100000 }
    },
    'sa-6-launcher': {
        platformClass: 'SA-6 Gainful',
        type: 'Facility',
        signatures: { baseRCS: 15 }
    },
    'mcm-vessel': { platformClass: 'Avenger Class', type: 'Ship', kinematics: { massKg: 1300000 }, signatures: { baseRCS: 100 } },
    'merchant-vessel': { platformClass: 'Container Ship', type: 'Ship', kinematics: { massKg: 200000000 }, signatures: { baseRCS: 200000 } },
    'target-drone': { platformClass: 'BQM-34', type: 'Aircraft', kinematics: { massKg: 1000 }, signatures: { baseRCS: 0.5 } },
    'transport-helo': { platformClass: 'CH-53K', type: 'Helicopter', kinematics: { massKg: 15000 }, signatures: { baseRCS: 20 } },
    'basic-mine': { platformClass: 'Moored Mine', type: 'Mine', signatures: { baseRCS: 0.1 } }
};

export const weaponProfiles: WeaponProfile[] = [
    {
        id: 'aim-120c',
        name: 'AIM-120C AMRAAM',
        type: 'Missile',
        maxRangeM: 105000,
        minRangeM: 2000,
        maxSpeedKts: 2400,
        cruiseSpeedKts: 2100,
        guidance: GuidanceType.Active,
        requiresIllumination: false,
        pk: 0.85,
        warheadType: WarheadType.BlastFragmentation,
        altitudeRmaxBonus: 0
    },
    {
        id: 'aim-9x',
        name: 'AIM-9X Sidewinder',
        type: 'Missile',
        maxRangeM: 35000,
        minRangeM: 500,
        maxSpeedKts: 1800,
        cruiseSpeedKts: 1500,
        guidance: GuidanceType.Passive,
        requiresIllumination: false,
        pk: 0.9,
        warheadType: WarheadType.BlastFragmentation,
        altitudeRmaxBonus: 0
    },
    {
        id: 'rim-66m',
        name: 'SM-2MR Block IIIB',
        type: 'Missile',
        maxRangeM: 167000,
        minRangeM: 3000,
        maxSpeedKts: 2200,
        cruiseSpeedKts: 1900,
        guidance: GuidanceType.SemiActive,
        requiresIllumination: true,
        pk: 0.8,
        warheadType: WarheadType.BlastFragmentation,
        altitudeRmaxBonus: 0
    },
    {
        id: 'sa-6-missile',
        name: '3M9 Missile',
        type: 'Missile',
        maxRangeM: 24000,
        minRangeM: 3000,
        maxSpeedKts: 1700,
        cruiseSpeedKts: 1400,
        guidance: GuidanceType.SemiActive,
        requiresIllumination: true,
        pk: 0.7,
        warheadType: WarheadType.BlastFragmentation,
        altitudeRmaxBonus: 0
    }
];

export const scenarios: ScenarioManifest[] = [
    {
        id: 'training-cap',
        name: 'CAP Training',
        description: 'Standard Combat Air Patrol training scenario.',
        entities: [],
        events: [],
        assertions: [],
        origin: { lat: 0, lon: 0 }
    }
];

import { EntityProfile, SensorType } from "../sdk/index.js";

/**
 * Platform Profiles: Physical blueprints for ships, planes, etc.
 */
export const profiles: Record<string, EntityProfile> = {
    'ddg-destroyer': {
        type: 'Ship',
        health: { maxHp: 2500 },
        kinematics: { massKg: 9000000, maxSpeedKts: 32, cruiseSpeedKts: 20 },
        propulsion: { maxThrustDryN: 5000000, spoolRate: 0.1, sfcDry: 0.5 },
        fuel: { maxKg: 500000 },
        sensors: [
            { name: 'AN/SPY-1D', type: SensorType.Radar, maxRangeM: 180000 },
            { name: 'SPS-67 Surface Search', type: SensorType.Radar, maxRangeM: 60000 }
        ],
        combat: {
            mounts: [
                { name: 'Mk41-VLS', magazineIndices: [0], arcs: [-180, 180], slewRate: 30, reloadTicks: 10, alignmentThresholdDeg: 1.0 },
                { name: 'Mk141-Harpoon', magazineIndices: [1], arcs: [-90, 90], slewRate: 10, reloadTicks: 100, alignmentThresholdDeg: 1.0 },
                { name: 'Mk15-Phalanx', magazineIndices: [2], arcs: [-180, 180], slewRate: 120, reloadTicks: 1, alignmentThresholdDeg: 1.0 },
                { name: 'Mk45-5-inch', magazineIndices: [3], arcs: [-150, 150], slewRate: 20, reloadTicks: 30, alignmentThresholdDeg: 1.0 }
            ],
            magazines: [
                { weaponProfileId: 'sm-6', capacity: 96 },
                { weaponProfileId: 'harpoon', capacity: 8 },
                { weaponProfileId: '20mm-phalanx', capacity: 1500 },
                { weaponProfileId: '127mm-shell', capacity: 600 }
            ]
        }
    },
    'hostile-frigate': {
        type: 'Ship',
        health: { maxHp: 1500 },
        kinematics: { massKg: 4000000, maxSpeedKts: 28, cruiseSpeedKts: 18 },
        propulsion: { maxThrustDryN: 2000000, spoolRate: 0.1, sfcDry: 0.5 },
        fuel: { maxKg: 300000 },
        sensors: [
            { name: 'Type-382 Radar', type: SensorType.Radar, maxRangeM: 120000 },
            { name: 'Type-364 Search', type: SensorType.Radar, maxRangeM: 50000 }
        ],
        combat: {
            mounts: [
                { name: 'VLS-AAM', magazineIndices: [0], arcs: [-180, 180], slewRate: 30, reloadTicks: 20 },
                { name: 'SSM-Launcher', magazineIndices: [1], arcs: [-90, 90], slewRate: 10, reloadTicks: 120 },
                { name: 'H/PJ-26-76mm', magazineIndices: [2], arcs: [-150, 150], slewRate: 30, reloadTicks: 10 }
            ],
            magazines: [
                { weaponProfileId: 'hq-16', capacity: 32 },
                { weaponProfileId: 'c-802', capacity: 8 },
                { weaponProfileId: '76mm-shell', capacity: 500 }
            ]
        }
    },
    'f-35a': {
        type: 'Aircraft',
        health: { maxHp: 200 },
        kinematics: { massKg: 13000, maxSpeedKts: 1200, cruiseSpeedKts: 500, maxAltitudeM: 15000 },
        propulsion: { maxThrustDryN: 125000, spoolRate: 0.4, sfcDry: 0.8 },
        fuel: { maxKg: 8000 },
        sensors: [{ name: 'AN/APG-81 Radar', type: SensorType.Radar, maxRangeM: 150000 }],
        signatures: { baseRCS: 0.001 },
        aero: { wingAreaS: 42, liftCoeffCl: 0.6, dragCoeffCd: 0.015 },
        combat: {
            mounts: [
                { name: 'Internal-Bay-L', magazineIndices: [0], arcs: [-10, 10], slewRate: 5, reloadTicks: 50 },
                { name: 'Internal-Bay-R', magazineIndices: [1], arcs: [-10, 10], slewRate: 5, reloadTicks: 50 },
                { name: 'GAU-22-Cannon', magazineIndices: [2], arcs: [-5, 5], slewRate: 1, reloadTicks: 1 }
            ],
            magazines: [
                { weaponProfileId: 'aim-120', capacity: 2 },
                { weaponProfileId: 'aim-120', capacity: 2 },
                { weaponProfileId: '25mm-shell', capacity: 180 }
            ]
        }
    },
    'mcm-vessel': {
        type: 'Ship',
        kinematics: { massKg: 1000000, maxSpeedKts: 15, cruiseSpeedKts: 10 },
        propulsion: { maxThrustDryN: 500000, spoolRate: 0.2, sfcDry: 0.4 },
        fuel: { maxKg: 100000 },
        sensors: [{ name: 'Short-Range Sonar', type: SensorType.Sonar, maxRangeM: 5000 }],
        signatures: { acousticSL: 110 }
    },
    'merchant-vessel': {
        type: 'Ship',
        kinematics: { massKg: 50000000, maxSpeedKts: 18, cruiseSpeedKts: 14 },
        propulsion: { maxThrustDryN: 2000000, spoolRate: 0.05, sfcDry: 0.3 },
        fuel: { maxKg: 1000000 },
        signatures: { baseRCS: 5000, acousticSL: 150 }
    },
    'target-drone': {
        type: 'Aircraft',
        health: { maxHp: 50 },
        kinematics: { massKg: 500, maxSpeedKts: 450, cruiseSpeedKts: 300 },
        propulsion: { maxThrustDryN: 8000, spoolRate: 0.5, sfcDry: 1.2 },
        fuel: { maxKg: 200 },
        sensors: [{ name: 'EO/IR', type: SensorType.Visual, maxRangeM: 15000 }],
        signatures: { baseRCS: 5.0 },
        aero: { wingAreaS: 25, liftCoeffCl: 0.5, dragCoeffCd: 0.02 }
    },
    'transport-helo': {
        type: 'Helicopter',
        kinematics: { massKg: 5000, maxSpeedKts: 160, cruiseSpeedKts: 120 },
        propulsion: { maxThrustDryN: 40000, spoolRate: 0.3, sfcDry: 0.8 },
        fuel: { maxKg: 1200 },
        sensors: [{ name: 'Surface Search Radar', type: SensorType.Radar, maxRangeM: 40000 }],
        aero: { wingAreaS: 40 }
    },
    'ford-class-carrier': {
        type: 'Ship',
        health: { maxHp: 20000 },
        kinematics: { massKg: 100000000, maxSpeedKts: 30, cruiseSpeedKts: 22 },
        propulsion: { maxThrustDryN: 20000000, spoolRate: 0.05, sfcDry: 0.4 },
        fuel: { maxKg: 5000000 },
        sensors: [
            { name: 'AN/SPY-3 Radar', type: SensorType.Radar, maxRangeM: 200000 },
            { name: 'SPS-73 Search', type: SensorType.Radar, maxRangeM: 80000 }
        ],
        combat: {
            mounts: [
                { name: 'Phalanx-Aft', magazineIndices: [0], arcs: [120, 240], slewRate: 120, reloadTicks: 1 },
                { name: 'RAM-Fore', magazineIndices: [1], arcs: [-60, 60], slewRate: 60, reloadTicks: 10 }
            ],
            magazines: [
                { weaponProfileId: '20mm-phalanx', capacity: 1500 },
                { weaponProfileId: 'rim-116', capacity: 21 }
            ]
        },
        aviation: {
            hangarCapacity: 75,
            aviationFuelKg: 10000000
        }
    },
    'fa-18-super-hornet': {
        type: 'Aircraft',
        kinematics: { massKg: 14500, maxSpeedKts: 1030, cruiseSpeedKts: 550, maxAltitudeM: 15000 },
        propulsion: { maxThrustDryN: 110000, spoolRate: 0.35, sfcDry: 0.85 },
        fuel: { maxKg: 6500 },
        sensors: [{ name: 'AN/APG-79 Radar', type: SensorType.Radar, maxRangeM: 130000 }],
        aero: { wingAreaS: 46, liftCoeffCl: 0.55, dragCoeffCd: 0.018 },
        combat: {
            mounts: [
                { name: 'Station-1', magazineIndices: [0], arcs: [0, 0], slewRate: 0, reloadTicks: 0 },
                { name: 'Station-2', magazineIndices: [1], arcs: [0, 0], slewRate: 0, reloadTicks: 0 }
            ],
            magazines: [
                { weaponProfileId: 'aim-120', capacity: 2 },
                { weaponProfileId: 'aim-120', capacity: 2 }
            ]
        }
    },
    'basic-mine': {
        type: 'Mine',
        kinematics: { massKg: 500 },
        health: { maxHp: 10 },
        sensors: [{ name: 'Acoustic Trigger', type: SensorType.Sonar, maxRangeM: 50 }]
    },
    'sm-6-projectile': {
        type: 'Weapon',
        kinematics: { massKg: 1500, maxSpeedKts: 2500, cruiseSpeedKts: 2000, maxAltitudeM: 35000 },
        propulsion: { maxThrustDryN: 45000, spoolRate: 1.0, sfcDry: 3.0 },
        fuel: { maxKg: 300 },
        signatures: { baseRCS: 0.1 },
        stages: [
            { name: 'Booster', durationTicks: 300, thrustN: 120000, separateOnComplete: true, guidanceMode: 'None' },
            { name: 'Sustainer', durationTicks: 300, thrustN: 45000, separateOnComplete: false }
        ]
    },
    'aim-120-projectile': {
        type: 'Weapon',
        kinematics: { massKg: 152, maxSpeedKts: 3000, maxAltitudeM: 30000 },
        propulsion: { maxThrustDryN: 10000, spoolRate: 1.0, sfcDry: 4.0 },
        fuel: { maxKg: 50 },
        signatures: { baseRCS: 0.05 },
        stages: [{ name: 'Motor', durationTicks: 400, thrustN: 10000, separateOnComplete: false }]
    },
    'harpoon-projectile': {
        type: 'Weapon',
        kinematics: { massKg: 690, maxSpeedKts: 550, maxAltitudeM: 1000 },
        propulsion: { maxThrustDryN: 3000, spoolRate: 0.5, sfcDry: 0.5 },
        fuel: { maxKg: 100 },
        signatures: { baseRCS: 0.5 },
        stages: [
            { name: 'Booster', durationTicks: 40, thrustN: 50000, separateOnComplete: true, guidanceMode: 'None' },
            { name: 'Sustainer', durationTicks: 2000, thrustN: 3000, separateOnComplete: false }
        ]
    },
    'c-802-projectile': {
        type: 'Weapon',
        kinematics: { massKg: 715, maxSpeedKts: 600, maxAltitudeM: 1000 },
        propulsion: { maxThrustDryN: 3500, spoolRate: 0.5, sfcDry: 0.5 },
        fuel: { maxKg: 110 },
        signatures: { baseRCS: 0.5 },
        stages: [
            { name: 'Booster', durationTicks: 40, thrustN: 55000, separateOnComplete: true, guidanceMode: 'None' },
            { name: 'Sustainer', durationTicks: 2000, thrustN: 3500, separateOnComplete: false }
        ]
    },
    'hq-16-projectile': {
        type: 'Weapon',
        kinematics: { massKg: 600, maxSpeedKts: 2800, maxAltitudeM: 25000 },
        propulsion: { maxThrustDryN: 20000, spoolRate: 1.0, sfcDry: 3.0 },
        fuel: { maxKg: 150 },
        signatures: { baseRCS: 0.2 },
        stages: [{ name: 'Motor', durationTicks: 500, thrustN: 20000, separateOnComplete: false }]
    },
    '127mm-projectile': {
        type: 'Weapon',
        kinematics: { massKg: 32, maxSpeedKts: 1600, cruiseSpeedKts: 1600 },
        signatures: { baseRCS: 0.01 }
    },
    '76mm-projectile': {
        type: 'Weapon',
        kinematics: { massKg: 6, maxSpeedKts: 1800, cruiseSpeedKts: 1800 },
        signatures: { baseRCS: 0.005 }
    },
    '20mm-projectile': {
        type: 'Weapon',
        kinematics: { massKg: 0.1, maxSpeedKts: 2200, cruiseSpeedKts: 2200 },
        signatures: { baseRCS: 0.001 }
    },
    '25mm-projectile': {
        type: 'Weapon',
        kinematics: { massKg: 0.2, maxSpeedKts: 2200, cruiseSpeedKts: 2200 },
        signatures: { baseRCS: 0.001 }
    }
};

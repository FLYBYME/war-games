import { GuidanceType, ScenarioManifest, SensorType, Side, WarheadType, MissionType } from "../sdk/index.js"

export const scenarios: ScenarioManifest[] = [
    {
        id: "salvo-aggregation",
        name: "Salvo Aggregation Optimization",
        description: "Verification the performance of salvo aggregation optimization.",
        origin: { lat: 20.0, lon: 108.0 },
        entities: [
            {
                id: "ship-1",
                profile: {
                    type: 'Ship',
                    kinematics: { massKg: 9000000, maxSpeedKts: 32, cruiseSpeedKts: 20 },
                    propulsion: { maxThrustDryN: 5000000, spoolRate: 0.1, sfcDry: 0.5 },
                    fuel: { maxKg: 500000 },
                    sensors: [
                        { name: 'AN/SPY-1D', type: SensorType.Radar, maxRangeM: 180000 },
                        { name: 'SPS-67 Surface Search', type: SensorType.Radar, maxRangeM: 60000 }
                    ],
                    combat: {
                        mounts: [
                            { name: 'Mk41-VLS', magazineIndices: [0], arcs: [-180, 180], slewRate: 0, reloadTicks: 10 },
                            { name: 'Mk141-Harpoon', magazineIndices: [1], arcs: [-90, 90], slewRate: 10, reloadTicks: 100 },
                            { name: 'Mk15-Phalanx', magazineIndices: [2], arcs: [-180, 180], slewRate: 120, reloadTicks: 1 },
                            { name: 'Mk45-5-inch', magazineIndices: [3], arcs: [-150, 150], slewRate: 20, reloadTicks: 30 }
                        ],
                        magazines: [
                            { weaponProfileId: 'sm-6', capacity: 50 },
                            { weaponProfileId: 'harpoon', capacity: 50 },
                            { weaponProfileId: '20mm-phalanx', capacity: 50 },
                            { weaponProfileId: '127mm-shell', capacity: 50 }
                        ]
                    }
                },
                side: Side.Blue,
                pos: { x: 0, y: 0, z: 0 },
                heading: 0
            },
            {
                id: "plane-1",
                profile: {
                    type: 'Aircraft',
                    kinematics: { massKg: 13000, maxSpeedKts: 1200, cruiseSpeedKts: 500, maxAltitudeM: 15000 },
                    propulsion: { maxThrustDryN: 125000, maxThrustAbN: 190000, spoolRate: 0.2, sfcDry: 0.8 },
                    fuel: { maxKg: 8000 },
                    sensors: [
                        { name: 'AN/APG-81', type: SensorType.Radar, maxRangeM: 150000 },
                        { name: 'EOTS', type: SensorType.IRST, maxRangeM: 80000 }
                    ],
                    combat: {
                        mounts: [
                            { name: 'GAU-22/A', magazineIndices: [0], arcs: [-5, 5], slewRate: 100, reloadTicks: 1 },
                            { name: 'Internal-Bay-L', magazineIndices: [1], arcs: [-180, 180], slewRate: 30, reloadTicks: 10 },
                            { name: 'Internal-Bay-R', magazineIndices: [2], arcs: [-180, 180], slewRate: 30, reloadTicks: 10 }
                        ],
                        magazines: [
                            { weaponProfileId: '25mm-shell', capacity: 180 },
                            { weaponProfileId: 'aim-120', capacity: 2 },
                            { weaponProfileId: 'aim-120', capacity: 2 }
                        ]
                    },
                    signatures: { baseRCS: 0.001 }
                },
                side: Side.Red,
                pos: { x: -5000, y: 0, z: 5000 },
                heading: 0,
                speedKts: 400
            }
        ],
        events: [],
        assertions: [
            { type: 'event_occurred', event: 'WeaponFired', byTick: 2000 },
            { type: 'event_occurred', event: 'Impact', byTick: 5000 }
        ],
        intents: [
            {
                type: 'Mission',
                actorId: 'ship-1',
                missionType: MissionType.Patrol,
                params: { center: { x: 0, y: 0, z: 0 }, radiusM: 0, speedKts: 30 }
            },
            {
                type: 'Mission',
                actorId: 'plane-1',
                missionType: MissionType.Strike,
                params: { targetId: 'ship-1', speedKts: 600 }
            },
            {
                type: 'Doctrine',
                actorId: 'ship-1',
                roe: 'Free',
                wra: [
                    { targetType: 'Air', weaponType: 'sm-6', quantity: 2, maxRangePct: 1.0 },
                    { targetType: 'Air', weaponType: '20mm-phalanx', quantity: 50, maxRangePct: 1.0 },
                    { targetType: 'Weapon', weaponType: '20mm-phalanx', quantity: 20, maxRangePct: 1.0 },
                    { targetType: 'Air', weaponType: '127mm-shell', quantity: 1, maxRangePct: 1.0 }
                ]
            },
            {
                type: 'Doctrine',
                actorId: 'plane-1',
                roe: 'Free',
                wra: [
                    { targetType: 'Surface', weaponType: '25mm-shell', quantity: 30, maxRangePct: 1.0 }
                ]
            }
        ],
        weaponProfiles: [
            {
                id: '20mm-phalanx',
                name: '20mm Phalanx CIWS',
                type: 'Gun',
                maxRangeM: 2500,
                minRangeM: 0,
                maxSpeedKts: 2200,
                cruiseSpeedKts: 2200,
                guidance: GuidanceType.Ballistic,
                requiresIllumination: false,
                pk: 0.1,
                warheadType: WarheadType.Kinetic,
                altitudeRmaxBonus: 0,
                entityProfileId: '20mm-projectile',
                burst: {
                    muzzleVelocity: { x: 0, y: 1100, z: 0 },
                    roundsPerSecond: 75,
                    dispersionDeg: 0.5,
                    caliberMm: 20
                }
            },
            {
                id: '25mm-shell',
                name: '25mm GAU-22/A',
                type: 'Gun',
                maxRangeM: 3000,
                minRangeM: 0,
                maxSpeedKts: 2200,
                cruiseSpeedKts: 2200,
                guidance: GuidanceType.Ballistic,
                requiresIllumination: false,
                pk: 0.1,
                warheadType: WarheadType.Kinetic,
                altitudeRmaxBonus: 0,
                entityProfileId: '25mm-projectile',
                burst: {
                    muzzleVelocity: { x: 0, y: 1100, z: 0 },
                    roundsPerSecond: 50,
                    dispersionDeg: 0.4,
                    caliberMm: 25
                }
            },
            {
                id: '127mm-shell',
                name: '127mm Mk45 Shell',
                type: 'Gun',
                maxRangeM: 24000,
                minRangeM: 0,
                maxSpeedKts: 1600,
                cruiseSpeedKts: 1600,
                guidance: GuidanceType.Ballistic,
                requiresIllumination: false,
                pk: 0.3,
                warheadType: WarheadType.BlastFragmentation,
                altitudeRmaxBonus: 0,
                entityProfileId: '127mm-shell',
                burst: {
                    muzzleVelocity: { x: 0, y: 800, z: 0 },
                    roundsPerSecond: 0.3,
                    dispersionDeg: 0.1,
                    caliberMm: 127
                }
            }
        ],
        platformProfiles: {
            '20mm-projectile': {
                type: 'Weapon',
                kinematics: { massKg: 0.1, maxSpeedKts: 2200, cruiseSpeedKts: 2200 },
                signatures: { baseRCS: 0.001 }
            },
            '25mm-projectile': {
                type: 'Weapon',
                kinematics: { massKg: 0.2, maxSpeedKts: 2200, cruiseSpeedKts: 2200 },
                signatures: { baseRCS: 0.001 }
            },
            '127mm-shell': {
                type: 'Weapon',
                kinematics: { massKg: 30, maxSpeedKts: 1600, cruiseSpeedKts: 1600 },
                signatures: { baseRCS: 0.01 }
            }
        }
    },
    {
        id: "multi-domain-tactical",
        name: "Multi-Domain Tactical Engagement Study",
        description: "Expanded study involving a DDG, multi-role fighters, and a hostile frigate.",
        origin: { lat: 20.629, lon: 108.677 },
        entities: [
            {
                id: "uss-arleigh-burke",
                profileId: "ddg-destroyer",
                side: Side.Blue,
                pos: { x: 1000, y: 1000, z: 0 },
                heading: 90
            },
            {
                id: "friendly-f35-1",
                profileId: "f-35a",
                side: Side.Blue,
                pos: { x: -5000, y: -5000, z: 10000 },
                heading: 45,
                speedKts: 500
            },
            {
                id: "hostile-frigate-1",
                profileId: "hostile-frigate",
                side: Side.Red,
                pos: { x: 40000, y: 10000, z: 0 },
                heading: 270
            },
            {
                id: "swarm-1",
                profileId: "target-drone",
                side: Side.Red,
                pos: { x: 20000, y: 0, z: 500 },
                heading: 270,
                speedKts: 300
            },
            {
                id: "swarm-2",
                profileId: "target-drone",
                side: Side.Red,
                pos: { x: 22000, y: 500, z: 450 },
                heading: 270,
                speedKts: 300
            }
        ],
        events: [],
        assertions: [
            { type: 'event_occurred', event: 'WeaponFired', byTick: 2000 },
            { type: 'event_occurred', event: 'Impact' }
        ],
        intents: [
            {
                type: 'Mission',
                actorId: 'uss-arleigh-burke',
                missionType: MissionType.Patrol,
                params: { center: { x: 10000, y: 0, z: 0 }, radiusM: 5000, speedKts: 20 }
            },
            {
                type: 'Mission',
                actorId: 'friendly-f35-1',
                missionType: MissionType.Patrol,
                params: { center: { x: 20000, y: 10000, z: 10000 }, radiusM: 10000, speedKts: 500 }
            },
            {
                type: 'Mission',
                actorId: 'hostile-frigate-1',
                missionType: MissionType.Strike,
                params: { targetId: 'uss-arleigh-burke' }
            },
            {
                type: 'Doctrine',
                side: Side.Blue,
                roe: 'Free',
                emcon: 'Charlie',
                wra: [
                    { targetType: 'Air', weaponType: 'sm-6', quantity: 2 },
                    { targetType: 'Air', weaponType: 'aim-120', quantity: 1 },
                    { targetType: 'Surface', weaponType: 'harpoon', quantity: 2 },
                    { targetType: 'Surface', weaponType: '127mm-shell', quantity: 5 },
                    { targetType: 'Air', weaponType: '20mm-phalanx', quantity: 10 }
                ]
            },
            {
                type: 'Doctrine',
                side: Side.Red,
                roe: 'Free',
                emcon: 'Charlie',
                wra: [
                    { targetType: 'Surface', weaponType: 'c-802', quantity: 2 },
                    { targetType: 'Air', weaponType: 'hq-16', quantity: 1 },
                    { targetType: 'Surface', weaponType: '76mm-shell', quantity: 3 }
                ]
            }
        ]
    },
    {
        id: "naval-surface-duel",
        name: "Naval Surface Duel Study",
        description: "One-on-one surface engagement using guided missiles and ballistic naval guns.",
        origin: { lat: 21.5, lon: 108.5 },
        entities: [
            {
                id: "uss-arleigh-burke",
                profileId: "ddg-destroyer",
                side: Side.Blue,
                pos: { x: 0, y: 0, z: 0 },
                heading: 90
            },
            {
                id: "hostile-frigate-1",
                profileId: "hostile-frigate",
                side: Side.Red,
                pos: { x: 15000, y: 0, z: 0 },
                heading: 270
            }
        ],
        events: [],
        assertions: [
            { type: 'event_occurred', event: 'WeaponFired' },
            { type: 'event_occurred', event: 'Impact' }
        ],
        intents: [
            {
                type: 'Mission',
                actorId: 'uss-arleigh-burke',
                missionType: MissionType.Patrol,
                params: { center: { x: 5000, y: 0, z: 0 }, radiusM: 0, speedKts: 25 }
            },
            {
                type: 'Mission',
                actorId: 'hostile-frigate-1',
                missionType: MissionType.Patrol,
                params: { center: { x: 10000, y: 0, z: 0 }, radiusM: 0, speedKts: 20 }
            },
            {
                type: 'Doctrine',
                side: Side.Blue,
                roe: 'Free',
                emcon: 'Charlie',
                wra: [
                    { targetType: 'Surface', weaponType: 'harpoon', quantity: 2, maxRangePct: 1.0 },
                    { targetType: 'Surface', weaponType: '127mm-shell', quantity: 1, maxRangePct: 0.95 }
                ]
            },
            {
                type: 'Doctrine',
                side: Side.Red,
                roe: 'Free',
                emcon: 'Charlie',
                wra: [
                    { targetType: 'Surface', weaponType: 'c-802', quantity: 2, maxRangePct: 1.0 },
                    { targetType: 'Surface', weaponType: '76mm-shell', quantity: 1, maxRangePct: 0.95 }
                ]
            }
        ]
    },
    {
        id: "carrier-strike-group",
        name: "Carrier Strike Group Alpha",
        description: "Carrier flight deck operations with hosted Super Hornets.",
        origin: { lat: 20.0, lon: 108.0 },
        entities: [
            {
                id: "cvn-78",
                profileId: "ford-class-carrier",
                side: Side.Blue,
                pos: { x: 0, y: 0, z: 0 },
                heading: 90
            },
            {
                id: "hornet-1",
                profileId: "fa-18-super-hornet",
                side: Side.Blue,
                pos: { x: 0, y: 0, z: 0 } // Slaved to carrier deck
            },
            {
                id: "hornet-2",
                profileId: "fa-18-super-hornet",
                side: Side.Blue,
                pos: { x: 0, y: 0, z: 0 } // Slaved to carrier deck
            }
        ],
        events: [
            {
                tick: 100,
                command: { type: "LaunchAircraft", entityId: "hornet-1" }
            },
            {
                tick: 200,
                command: {
                    type: "SetMission",
                    entityId: "hornet-1",
                    missionType: MissionType.Patrol,
                    params: { center: { x: 5000, y: 5000, z: 5000 }, radiusM: 2000, speedKts: 400 }
                }
            },
            {
                tick: 600,
                command: { type: "LaunchAircraft", entityId: "hornet-2" }
            },
            {
                tick: 700,
                command: {
                    type: "SetMission",
                    entityId: "hornet-2",
                    missionType: MissionType.Patrol,
                    params: { center: { x: -5000, y: 5000, z: 5000 }, radiusM: 2000, speedKts: 400 }
                }
            }
        ],
        assertions: [
            { type: "event_occurred", event: "AircraftLaunched", byTick: 2000 },
            { type: "speed_at_least", params: { entityId: "hornet-1", speedKts: 150 }, tick: 500 }
        ],
        intents: [
            {
                type: "Logistics",
                baseId: "cvn-78",
                hostedEntities: ["hornet-1", "hornet-2"],
                initialState: "Ready"
            },
            {
                type: "Mission",
                actorId: "cvn-78",
                missionType: MissionType.Patrol,
                params: { center: { x: 20000, y: 0, z: 0 }, radiusM: 0, speedKts: 25 }
            }
        ]
    },
    {
        id: "maritime-interdiction",
        name: "Maritime Interdiction (VBSS) Operation",
        description: "A helicopter-borne VBSS operation on a non-cooperative vessel.",
        origin: { lat: 20.0, lon: 110.0 },
        entities: [
            {
                id: "marching-helo",
                profileId: "transport-helo",
                side: Side.Blue,
                pos: { x: 0, y: 0, z: 100 },
                heading: 0,
                speedKts: 100
            },
            {
                id: "suspect-vessel",
                profileId: "merchant-vessel",
                side: Side.Red,
                pos: { x: 10000, y: 0, z: 0 },
                heading: 45
            }
        ],
        intents: [
            {
                type: 'Mission',
                actorId: 'marching-helo',
                missionType: MissionType.VBSS,
                params: {
                    targetId: 'suspect-vessel',
                    boardingDurationTicks: 300,
                    allowedArea: {
                        points: [
                            { x: 5000, y: -5000, z: 0 },
                            { x: 15000, y: -5000, z: 0 },
                            { x: 15000, y: 5000, z: 0 },
                            { x: 5000, y: 5000, z: 0 }
                        ]
                    }
                }
            },
            {
                type: 'Mission',
                actorId: 'suspect-vessel',
                missionType: MissionType.Patrol,
                params: {
                    center: { x: 15000, y: 5000, z: 0 },
                    radiusM: 0,
                    speedKts: 12
                }
            }
        ],
        assertions: [
            { type: 'event_occurred', event: 'BoardingStarted' },
            { type: 'event_occurred', event: 'EntitySideChanged' }
        ]
    },
    {
        id: "minefield-transit",
        name: "Minefield Transit Risk Study",
        description: "Evaluation of ship survivability while transiting a dense minefield.",
        origin: { lat: 21.0, lon: 109.0 },
        entities: [
            {
                id: "transit-ship",
                profileId: "ddg-destroyer",
                side: Side.Blue,
                pos: { x: 0, y: 0, z: 0 },
                heading: 90
            }
        ],
        intents: [
            {
                type: 'Mission',
                actorId: 'transit-ship',
                missionType: MissionType.Patrol,
                params: {
                    center: { x: 5000, y: 0, z: 0 },
                    radiusM: 0,
                    speedKts: 10
                }
            }
        ],
        events: [
            { tick: 0, command: { type: 'SpawnEntity', id: 'mine-1', profileId: 'basic-mine', side: Side.Red, position: { x: 2000, y: 0, z: -5 }, heading: 0 } },
            { tick: 0, command: { type: 'SpawnEntity', id: 'mine-2', profileId: 'basic-mine', side: Side.Red, position: { x: 2050, y: 10, z: -5 }, heading: 0 } },
            { tick: 0, command: { type: 'SpawnEntity', id: 'mine-3', profileId: 'basic-mine', side: Side.Red, position: { x: 2100, y: -10, z: -5 }, heading: 0 } }
        ],
        assertions: [
            { type: 'event_occurred', event: 'Detonation' }
        ]
    },
    {
        id: "mine-countermeasures",
        name: "Mine Countermeasures (MCM) Clearing",
        description: "Methodical clearing of a minefield using a specialized MCM vessel.",
        origin: { lat: 21.0, lon: 109.0 },
        entities: [
            {
                id: "mcm-ship",
                profileId: "mcm-vessel",
                side: Side.Blue,
                pos: { x: 0, y: 0, z: 0 },
                heading: 90
            }
        ],
        intents: [
            {
                type: 'Mission',
                actorId: 'mcm-ship',
                missionType: MissionType.MCM,
                params: {
                    method: 'Sweep',
                    area: {
                        points: [
                            { x: 1000, y: -500, z: 0 },
                            { x: 5000, y: -500, z: 0 },
                            { x: 5000, y: 500, z: 0 },
                            { x: 1000, y: 500, z: 0 }
                        ]
                    }
                }
            }
        ],
        events: [
            { tick: 0, command: { type: 'SpawnEntity', id: 'mcm-mine-1', profileId: 'basic-mine', side: Side.Red, position: { x: 3000, y: 0, z: -5 }, heading: 0 } }
        ]
    },
    {
        id: "basic-movement",
        name: "Basic Movement Study",
        description: "Verification of ship and aircraft navigation from Point A to Point B.",
        origin: { lat: 20.0, lon: 108.0 },
        entities: [
            {
                id: "ship-1",
                profileId: "ddg-destroyer",
                side: Side.Blue,
                pos: { x: 0, y: 0, z: 0 },
                heading: 0
            },
            {
                id: "plane-1",
                profileId: "f-35a",
                side: Side.Blue,
                pos: { x: -5000, y: 0, z: 5000 },
                heading: 0,
                speedKts: 400
            }
        ],
        events: [],
        assertions: [
            { type: 'pos_within', params: { entityId: 'ship-1', position: { x: 0, y: 20000, z: 0 }, radiusM: 1000 } },
            { type: 'pos_within', params: { entityId: 'plane-1', position: { x: -5000, y: 40000, z: 5000 }, radiusM: 2000 } }
        ],
        intents: [
            {
                type: 'Mission',
                actorId: 'ship-1',
                missionType: MissionType.Patrol,
                params: { center: { x: 0, y: 20000, z: 0 }, radiusM: 0, speedKts: 30 }
            },
            {
                type: 'Mission',
                actorId: 'plane-1',
                missionType: MissionType.Patrol,
                params: { center: { x: -5000, y: 40000, z: 5000 }, radiusM: 0, speedKts: 500 }
            }
        ]
    }
]

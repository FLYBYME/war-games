import { z } from 'zod';
import { EntityIdSchema, Vector3Schema, LlaSchema, SideSchema, MissionTypeSchema, MissionSchema, MissionParamsSchema, GeoJSONSchema, WRARuleSchema } from './domain.js';

// ─── Scenario Intents ─────────────────────────────────────────

export const ScenarioIntentSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('Mission'),
        actorId: z.string().describe('Entity or Group ID'),
        missionType: MissionTypeSchema,
        params: MissionParamsSchema
    }),
    z.object({
        type: z.literal('Doctrine'),
        actorId: z.string().optional().describe('Optional Entity/Group ID. If null, applies to side.'),
        side: SideSchema.optional(),
        roe: z.enum(['Free', 'Tight', 'Hold']).optional(),
        emcon: z.enum(['Alpha', 'Bravo', 'Charlie']).optional(),
        wra: z.array(z.object({
            targetType: z.string().describe("Target category, e.g. 'Fighter', 'SmallBoat'"),
            weaponType: z.string().describe("Weapon profile ID to use"),
            quantity: z.number().describe("Number of munitions per engagement"),
            maxRangePct: z.number().optional().describe("Launch at % of max range"),
            minRangeM: z.number().optional().describe("Minimum safety range in meters")
        })).optional()
    }),
    z.object({
        type: z.literal('Group'),
        groupId: z.string(),
        leaderId: z.string(),
        members: z.array(z.string()),
        formationType: z.string().optional()
    }),
    z.object({
        type: z.literal('Logistics'),
        baseId: z.string(),
        hostedEntities: z.array(z.string()),
        initialState: z.string().optional().default('Ready')
    })
]);
export type ScenarioIntent = z.infer<typeof ScenarioIntentSchema>;

// ─── ViewState Models ─────────────────────────────────────────

export const ViewUnitPayloadSchema = z.object({
    id: EntityIdSchema,
    side: SideSchema,
    parentId: EntityIdSchema.optional(),
    pos: Vector3Schema,
    vel: Vector3Schema.optional(),
    lla: LlaSchema.optional(),
    heading: z.number().describe("Heading in degrees [0-360]"),
    hp: z.number().describe("Current hitpoints"),
    isDestroyed: z.boolean(),
    logState: z.string().describe("Logistics state, e.g. 'Ready', 'Taxiing', 'Refueling'"),
    fuelPct: z.number().min(0).max(1).describe("0.0 to 1.0. A value of 0 on a missile means motor burnout, NOT that it needs a refueling tanker"),
    isBingo: z.boolean().describe("True if unit has reached critical fuel state"),
    sensors: z.array(z.object({
        name: z.string(),
        rangeM: z.number(),
        azimuthDeg: z.number(),
        halfArcDeg: z.number(),
        active: z.boolean()
    })),
    mounts: z.array(z.object({
        id: z.string(),
        type: z.string(),
        roundsRemaining: z.number()
    })),
    losPolygon: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
    desiredSpeedKts: z.number().optional(),
    desiredAltitudeM: z.number().optional(),
    profileId: z.string().optional(),
    sensorMask: z.number().optional(),
    speedKts: z.number().optional().describe("Current kinematic speed in knots"),
    waypoints: z.array(z.object({ id: z.string(), pos: Vector3Schema, speedKts: z.number().optional() })).optional(),
    datalink: z.object({ 
        networkId: z.string().optional(),
        isActive: z.boolean().optional(),
        latency: z.number().optional(),
        nodes: z.array(z.string()).optional(), 
        edges: z.array(z.object({ a: z.string(), b: z.string(), latencyMs: z.number() })).optional() 
    }).optional(),
    coveragePolygons: z.object({ 
        radar: z.array(z.object({ lat: z.number(), lon: z.number() })).optional(), 
        wez: z.array(z.object({ lat: z.number(), lon: z.number() })).optional() 
    }).optional(),
    doctrine: z.object({ 
        roe: z.string(), 
        emcon: z.string(), 
        wraRules: z.array(WRARuleSchema) 
    }).optional(),
    mission: MissionSchema.optional(),
    activeTasks: z.array(z.object({
        id: z.string(),
        type: z.string(),
        status: z.string()
    })).optional()
});
export type ViewUnitPayload = z.infer<typeof ViewUnitPayloadSchema>;

export const ViewTrackPayloadSchema = z.object({
    id: z.string(),
    pos: Vector3Schema,
    lla: LlaSchema.optional(),
    vel: Vector3Schema,
    classification: z.string(),
    identification: z.string().optional(),
    lastSeen: z.number().describe("Server tick when this track was last updated"),
    cep: z.number().describe("Circular Error Probable radius in meters"),
    heading: z.number().optional().describe("Heading in degrees [0-360]"),
    speedKts: z.number().optional().describe("Kinematic speed derived from velocity in knots")
});
export type ViewTrackPayload = z.infer<typeof ViewTrackPayloadSchema>;

export const ViewStatePayloadSchema = z.object({
    tick: z.number(),
    timestamp: z.number(),
    sequence: z.number(),
    isPaused: z.boolean(),
    side: SideSchema,
    origin: z.object({ lat: z.number(), lon: z.number() }),
    units: z.array(ViewUnitPayloadSchema),
    tracks: z.array(ViewTrackPayloadSchema), 
    losses: z.object({ blue: z.number(), red: z.number(), munitionsExpended: z.number() }),
    weather: z.object({
        precipitation: z.number().optional(), 
        precipitationRateMMhr: z.number().optional(),
        cloudCover: z.number(),
        seaState: z.number(),
        windSpeedKts: z.number(),
        windDirDeg: z.number(),
        visibilityNM: z.number(),
        temperatureC: z.number()
    }),
    datalinkGraph: z.object({
        nodes: z.array(z.string()),
        edges: z.array(z.object({ a: z.string(), b: z.string(), latencyMs: z.number() }))
    }),
    threatMap: z.array(z.object({ lat: z.number(), lon: z.number(), level: z.number() })).optional(),
    weaponBindings: z.array(z.object({
        weaponId: z.string(),
        targetId: z.string(),
        shooterId: z.string()
    })),
    esmBearings: z.array(z.object({
        observerId: z.string(),
        bearingDeg: z.number(),
        confidencePct: z.number(),
        targetId: z.string().optional()
    })),
    mapData: z.object({
        bathymetry: GeoJSONSchema.optional(),
        borders: GeoJSONSchema.optional()
    }).optional()
});
export type ViewStatePayload = z.infer<typeof ViewStatePayloadSchema>;
export type ViewStateSnapshot = ViewStatePayload; 

// ─── Engine Command Payloads ─────────────────────────────────

export const SetCourseSchema = z.object({
    type: z.literal('SetCourse').describe("Directly set a destination coordinate for the unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to command"),
    position: Vector3Schema.describe("Target destination coordinates (x, y, z) in meters"),
    speedKts: z.number().describe("Desired speed in knots for the transit")
});

export const AddWaypointSchema = z.object({
    type: z.literal('AddWaypoint').describe("Add a waypoint to the unit's existing navigation path"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to command"),
    position: Vector3Schema.describe("Waypoint coordinates (x, y, z) in meters"),
    speedKts: z.number().describe("Desired speed in knots for this segment of the path")
});

export const ClearWaypointsSchema = z.object({
    type: z.literal('ClearWaypoints').describe("Clear all waypoints and stop navigation for the unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to command")
});

export const FireWeaponSchema = z.object({
    type: z.literal('FireWeapon').describe("Order a unit to engage a target with a specific weapon mount"),
    entityId: EntityIdSchema.describe("The unique ID of the shooter unit"),
    mountIndex: z.number().describe("The index of the weapon mount to fire"),
    targetId: EntityIdSchema.describe("The unique ID of the target unit or track")
});

export const SetHeadingSchema = z.object({
    type: z.literal('SetHeading').describe("Set a specific absolute heading for the unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to command"),
    heading: z.number().describe("Target heading in degrees [0-360]")
});

export const SetSpeedSchema = z.object({
    type: z.literal('SetSpeed').describe("Set a desired speed for the unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to command"),
    speedKts: z.number().describe("Desired speed in knots")
});

export const SetAltitudeSchema = z.object({
    type: z.literal('SetAltitude').describe("Set a desired altitude or depth for the unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to command"),
    altitudeM: z.number().describe("Desired altitude (positive) or depth (negative) in meters")
});

export const SetEMCONSchema = z.object({
    type: z.literal('SetEMCON').describe("Set the Emission Control state for a unit or the entire side"),
    entityId: EntityIdSchema.optional().describe("The unique ID of the unit. If omitted, applies to the entire side."),
    state: z.string().describe("The EMCON state name (e.g., 'Active', 'Silent', 'A', 'B')")
});

export const SetSensorStateSchema = z.object({
    type: z.literal('SetSensorState').describe("Turn a specific sensor on or off"),
    entityId: EntityIdSchema.describe("The unique ID of the unit"),
    sensor: z.string().describe("The name or ID of the sensor to toggle"),
    active: z.boolean().describe("True to activate, false to deactivate")
});

export const SetUnitROESchema = z.object({
    type: z.literal('SetUnitROE').describe("Set the Rules of Engagement for a specific unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit"),
    roe: z.string().describe("The ROE state (e.g., 'Free', 'Tight', 'Hold')")
});

export const SetGlobalROESchema = z.object({
    type: z.literal('SetGlobalROE').describe("Set the Rules of Engagement for all units on the side"),
    roe: z.string().describe("The ROE state (e.g., 'Free', 'Tight', 'Hold')")
});

export const SetMissionROESchema = z.object({
    type: z.literal('SetMissionROE').describe("Set the Rules of Engagement for a specific mission"),
    roe: z.string().describe("The ROE state (e.g., 'Free', 'Tight', 'Hold')")
});

export const InterceptMissionSchema = z.object({
    missionType: z.literal('Intercept').describe("Assign intercept mission"),
    targetId: z.string().describe("Hostile track ID to intercept"),
    speedKts: z.number().describe("Intercept velocity")
});

export const PatrolMissionSchema = z.object({
    missionType: z.literal('Patrol').describe("Assign patrol mission"),
    center: Vector3Schema.describe("Center of patrol area"),
    radiusM: z.number().describe("Radius of patrol area"),
    searchPattern: z.string().optional().describe("Pattern type for searches"),
    speedKts: z.number().optional().describe("Patrol speed")
});

export const StrikeMissionSchema = z.object({
    missionType: z.literal('Strike').describe("Assign strike mission"),
    targetId: z.string().describe("Target ID to strike"),
    speedKts: z.number().optional().describe("Strike speed")
});

export const EscortMissionSchema = z.object({
    missionType: z.literal('Escort').describe("Assign escort mission"),
    targetId: z.string().describe("Friendly unit ID to escort"),
    speedKts: z.number().optional().describe("Escort speed")
});

export const VBSSMissionSchema = z.object({
    missionType: z.literal('VBSS').describe("Assign VBSS mission"),
    targetId: z.string(),
    boardingDurationTicks: z.number().optional(),
    allowedArea: z.unknown().optional()
});

export const MCMMissionSchema = z.object({
    missionType: z.literal('MCM').describe("Assign MCM mission"),
    method: z.string().optional(),
    area: z.unknown().optional()
});

export const IdleMissionSchema = z.object({
    missionType: z.literal('Idle').describe("Assign idle mission")
});

export const SetMissionSchema = z.object({
    type: z.literal('SetMission').describe("Assigns a new mission to a unit"),
    entityId: EntityIdSchema.describe("ID of the executing unit"),
    mission: z.discriminatedUnion('missionType', [InterceptMissionSchema, PatrolMissionSchema, StrikeMissionSchema, EscortMissionSchema, IdleMissionSchema, VBSSMissionSchema, MCMMissionSchema])
});

export const AssignWeaponSchema = z.object({
    type: z.literal('AssignWeapon').describe("Manually assign a weapon to a target"),
    entityId: EntityIdSchema.describe("The unique ID of the shooter unit"),
    mount: z.string().describe("The ID or index of the weapon mount"),
    targetId: EntityIdSchema.describe("The unique ID of the target unit or track")
});

export const JoinFormationSchema = z.object({
    type: z.literal('JoinFormation').describe("Order a unit to join a formation with a leader"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to join"),
    leaderId: EntityIdSchema.describe("The unique ID of the formation leader"),
    offset: Vector3Schema.describe("The relative offset (x, y, z) from the leader in meters")
});

export const BreakFormationSchema = z.object({
    type: z.literal('BreakFormation').describe("Order a unit to leave its current formation"),
    entityId: EntityIdSchema.describe("The unique ID of the unit")
});

export const SetLoadoutSchema = z.object({
    type: z.literal('SetLoadout').describe("Change the weapon and fuel loadout of a unit (must be at a facility)"),
    entityId: EntityIdSchema.describe("The unique ID of the unit"),
    loadout: z.string().describe("The ID of the loadout profile to apply")
});

export const SetEnvironmentSchema = z.object({
    type: z.literal('SetEnvironment').describe("Cheat/Debug: Modify environmental conditions"),
    key: z.string().describe("The environmental parameter to change (e.g., 'WindSpeed')"),
    value: z.number().describe("The new value for the parameter")
});

export const LandAtFacilitySchema = z.object({
    type: z.literal('LandAtFacility').describe("Order an aircraft to land at a specific facility"),
    entityId: EntityIdSchema.describe("The unique ID of the aircraft"),
    facilityId: EntityIdSchema.describe("The unique ID of the airbase or carrier")
});

export const TransferResourcesSchema = z.object({
    type: z.literal('TransferResources').describe("Transfer resources (e.g., fuel) between units"),
    fromId: EntityIdSchema.describe("The unique ID of the source unit"),
    toId: EntityIdSchema.describe("The unique ID of the recipient unit"),
    fuelKg: z.number().describe("The amount of fuel to transfer in kilograms")
});

export const ApplyDamageSchema = z.object({
    type: z.literal('ApplyDamage').describe("Cheat/Debug: Manually apply damage to a unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit"),
    damage: z.number().describe("The amount of damage to apply (0-100+)")
});

export const DestroyEntitySchema = z.object({
    type: z.literal('DestroyEntity').describe("Cheat/Debug: Immediately destroy a unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit")
});

export const SpawnEntitySchema = z.object({
    type: z.literal('SpawnEntity').describe("Spawn a new entity into the match from a profile"),
    id: z.string().describe("The unique ID to assign to the new entity"),
    profileId: z.string().describe("The ID of the platform profile to use (e.g., 'f-35a')"),
    side: SideSchema.describe("The side the unit belongs to"),
    position: Vector3Schema.describe("Initial spawning coordinates (x, y, z) in meters"),
    heading: z.number().describe("Initial spawning heading in degrees [0-360]"),
    speedKts: z.number().optional().describe("Optional initial speed in knots")
});

export const SetIntentSchema = z.object({
    type: z.literal('SetIntent').describe("High-level scenario automation: Set a tactical intent"),
    intent: ScenarioIntentSchema.describe("The scenario intent payload")
});

export const UpdateWRARulesSchema = z.object({
    type: z.literal('UpdateWRARules').describe("Update Weapon Release Authority rules for a unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit"),
    rules: z.array(WRARuleSchema).describe("The list of WRA rule objects")
});

export const LaunchAircraftSchema = z.object({
    type: z.literal('LaunchAircraft').describe("Order a ready aircraft to launch from its host facility"),
    entityId: EntityIdSchema.describe("The unique ID of the aircraft to launch")
});

export const EngineCommandPayloadSchema = z.discriminatedUnion('type', [
    SetCourseSchema,
    AddWaypointSchema,
    ClearWaypointsSchema,
    FireWeaponSchema,
    SetHeadingSchema,
    SetSpeedSchema,
    SetAltitudeSchema,
    SetEMCONSchema,
    SetSensorStateSchema,
    SetUnitROESchema,
    SetGlobalROESchema,
    SetMissionROESchema,
    SetMissionSchema,
    AssignWeaponSchema,
    JoinFormationSchema,
    BreakFormationSchema,
    SetLoadoutSchema,
    SetEnvironmentSchema,
    LandAtFacilitySchema,
    TransferResourcesSchema,
    ApplyDamageSchema,
    DestroyEntitySchema,
    SpawnEntitySchema,
    SetIntentSchema,
    UpdateWRARulesSchema,
    LaunchAircraftSchema
]);
export type EngineCommandPayload = z.infer<typeof EngineCommandPayloadSchema>;

// ─── Network Message Envelopes ───────────────────────────────

export const EngineEventSchema = z.object({
    tick: z.number(),
    type: z.string(),
    entityId: EntityIdSchema.optional(),
    targetId: EntityIdSchema.optional(),
    data: z.record(z.string(), z.any()).optional()
});
export type EngineEvent = z.infer<typeof EngineEventSchema>;

export const PlatformProfileSummarySchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    domain: z.string(),
    country: z.string()
});
export type PlatformProfileSummary = z.infer<typeof PlatformProfileSummarySchema>;

export const MatchInfoSchema = z.object({
    id: z.string(),
    tick: z.number(),
    entityCount: z.number(),
    isPaused: z.boolean(),
    timeCompression: z.number()
});
export type MatchInfo = z.infer<typeof MatchInfoSchema>;

export const ServerMessageSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('VIEW_STATE'), payload: ViewStatePayloadSchema }),
    z.object({ type: z.literal('COMMAND_ACK'), payload: z.object({ commandType: z.string(), success: z.boolean(), error: z.string().optional() }) }),
    z.object({ type: z.literal('EVENT'), payload: EngineEventSchema }),
    z.object({ type: z.literal('PROFILE_LIST'), payload: z.array(PlatformProfileSummarySchema) }),
    z.object({ type: z.literal('ERROR'), payload: z.object({ message: z.string() }) }),
    z.object({ type: z.literal('SCENARIO_EXPORTED'), payload: z.unknown() }),
    z.object({ type: z.literal('SCENARIO_IMPORTED'), payload: z.object({ success: z.boolean() }) })
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

export const ClientMessageSchema = z.discriminatedUnion('type', [
    z.object({ 
        type: z.literal('JOIN_MATCH'), 
        matchId: z.string(), 
        side: SideSchema,
        syncRateHz: z.number().optional(),
        fullSyncIntervalMs: z.number().optional()
    }),
    z.object({ type: z.literal('ISSUE_COMMAND'), matchId: z.string(), command: EngineCommandPayloadSchema }),
    z.object({ type: z.literal('SET_TIME_COMPRESSION'), matchId: z.string(), rate: z.number() }),
    z.object({ type: z.literal('GET_TELEMETRY'), matchId: z.string() }),
    z.object({ type: z.literal('GET_PROFILES'), matchId: z.string(), category: z.string().optional() }),
    z.object({ type: z.literal('EXPORT_SCENARIO'), matchId: z.string() }),
    z.object({ type: z.literal('IMPORT_SCENARIO'), matchId: z.string(), payload: z.unknown() }),
    z.object({ type: z.literal('SAVE_MATCH'), matchId: z.string(), filename: z.string() })
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

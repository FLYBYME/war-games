import { z } from 'zod';
import { EntityIdSchema, Vector3Schema, SideSchema } from './primitives.schema.js';
import { MissionTypeSchema, MissionParamsSchema, WRARuleSchema, GroupFormationSchema } from './tactical.schema.js';
import { EMCONStateSchema } from './sensor.schema.js';

// ─── Engine Command Payloads ─────────────────────────────────────────────────
// Each command is a strictly typed discriminated union member.
// AI Agents generate these from Zod schema descriptions.

// --- Navigation Commands ---

export const SetCourseSchema = z.object({
    type: z.literal('SetCourse').describe("Directly set a destination coordinate for the unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to command"),
    position: Vector3Schema.describe("Target destination coordinates in meters"),
    speedKts: z.number().describe("Desired transit speed in knots")
}).describe("Set a direct course to a position");

export const SetHeadingSchema = z.object({
    type: z.literal('SetHeading').describe("Set a specific absolute heading for the unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to command"),
    heading: z.number().describe("Target heading in degrees [0-360]")
}).describe("Set unit heading");

export const SetSpeedSchema = z.object({
    type: z.literal('SetSpeed').describe("Set a desired speed for the unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to command"),
    speedKts: z.number().describe("Desired speed in knots")
}).describe("Set unit speed");

export const SetAltitudeSchema = z.object({
    type: z.literal('SetAltitude').describe("Set a desired altitude or depth for the unit"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to command"),
    altitudeM: z.number().describe("Desired altitude (positive) or depth (negative) in meters")
}).describe("Set unit altitude");

export const AddWaypointSchema = z.object({
    type: z.literal('AddWaypoint').describe("Add a waypoint to the unit's navigation path"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to command"),
    position: Vector3Schema.describe("Waypoint coordinates in meters"),
    speedKts: z.number().describe("Desired speed for this path segment in knots")
}).describe("Add navigation waypoint");

export const ClearWaypointsSchema = z.object({
    type: z.literal('ClearWaypoints').describe("Clear all waypoints and stop navigation"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to command")
}).describe("Clear all waypoints");

export const JoinFormationSchema = z.object({
    type: z.literal('JoinFormation').describe("Order a unit to join a formation with a leader"),
    entityId: EntityIdSchema.describe("The unique ID of the unit to join"),
    leaderId: EntityIdSchema.describe("The unique ID of the formation leader"),
    offset: Vector3Schema.describe("Relative offset from the leader in meters")
}).describe("Join a formation");

export const BreakFormationSchema = z.object({
    type: z.literal('BreakFormation').describe("Order a unit to leave its current formation"),
    entityId: EntityIdSchema.describe("The unique ID of the unit")
}).describe("Leave formation");

// --- Sensor Commands ---

export const AddDetectionSchema = z.object({
    type: z.literal('AddDetection').describe("Manually add a detection for a unit"),
    entityId: EntityIdSchema.describe("The observer unit ID"),
    targetId: EntityIdSchema.describe("The target unit ID to detect")
}).describe("Add a manual detection");

export const SetSensorStateSchema = z.object({
    type: z.literal('SetSensorState').describe("Turn a specific sensor on or off"),
    entityId: EntityIdSchema.describe("The unit ID"),
    sensor: z.string().describe("Sensor name or ID"),
    active: z.boolean().describe("True to activate, false to deactivate")
}).describe("Toggle sensor state");

export const SetEMCONSchema = z.object({
    type: z.literal('SetEMCON').describe("Set Emission Control state for a unit or side"),
    entityId: EntityIdSchema.optional().describe("Unit ID. If omitted, applies to entire side."),
    state: z.string().describe("EMCON state name (e.g., 'Active', 'Silent')")
}).describe("Set EMCON state");

// --- Combat Commands ---

export const FireWeaponSchema = z.object({
    type: z.literal('FireWeapon').describe("Order a unit to fire a weapon at a target"),
    entityId: EntityIdSchema.describe("The shooter unit ID"),
    mountIndex: z.number().describe("Index of the weapon mount to fire"),
    targetId: EntityIdSchema.describe("The target unit or track ID")
}).describe("Fire weapon");

export const AssignWeaponSchema = z.object({
    type: z.literal('AssignWeapon').describe("Manually assign a weapon mount to a target"),
    entityId: EntityIdSchema.describe("The shooter unit ID"),
    mount: z.string().describe("The weapon mount ID or index"),
    targetId: EntityIdSchema.describe("The target unit or track ID")
}).describe("Assign weapon to target");

// --- Doctrine Commands ---

export const SetUnitROESchema = z.object({
    type: z.literal('SetUnitROE').describe("Set Rules of Engagement for a specific unit"),
    entityId: EntityIdSchema.describe("The unit ID"),
    roe: z.string().describe("ROE state (e.g., 'Free', 'Tight', 'Hold')")
}).describe("Set unit ROE");

export const SetGlobalROESchema = z.object({
    type: z.literal('SetGlobalROE').describe("Set ROE for all units on the side"),
    roe: z.string().describe("ROE state")
}).describe("Set global ROE");

export const SetMissionROESchema = z.object({
    type: z.literal('SetMissionROE').describe("Set ROE for a specific mission"),
    roe: z.string().describe("ROE state")
}).describe("Set mission ROE");

export const UpdateWRARulesSchema = z.object({
    type: z.literal('UpdateWRARules').describe("Update Weapon Release Authority rules"),
    entityId: EntityIdSchema.describe("The unit ID"),
    rules: z.array(WRARuleSchema).describe("WRA rule objects")
}).describe("Update WRA rules");

// --- Mission Commands ---

export const InterceptMissionSchema = z.object({
    type: z.literal('Intercept').describe("Assign intercept mission"),
    params: z.object({
        targetId: z.string().describe("Hostile track ID to intercept"),
        speedKts: z.number().describe("Intercept velocity in knots")
    })
}).describe("Intercept mission parameters");

export const PatrolMissionSchema = z.object({
    type: z.literal('Patrol').describe("Assign patrol mission"),
    params: z.object({
        center: Vector3Schema.describe("Center of patrol area"),
        radiusM: z.number().describe("Patrol area radius in meters"),
        searchPattern: z.string().optional().describe("Search pattern type"),
        speedKts: z.number().optional().describe("Patrol speed in knots")
    })
}).describe("Patrol mission parameters");

export const StrikeMissionSchema = z.object({
    type: z.literal('Strike').describe("Assign strike mission"),
    params: z.object({
        targetId: z.string().describe("Target ID to strike"),
        speedKts: z.number().optional().describe("Strike speed in knots")
    })
}).describe("Strike mission parameters");

export const EscortMissionSchema = z.object({
    type: z.literal('Escort').describe("Assign escort mission"),
    params: z.object({
        targetId: z.string().describe("Friendly unit ID to escort"),
        speedKts: z.number().optional().describe("Escort speed in knots")
    })
}).describe("Escort mission parameters");

export const VBSSMissionSchema = z.object({
    type: z.literal('VBSS').describe("Assign VBSS boarding mission"),
    params: z.object({
        targetId: z.string().describe("Target vessel ID"),
        boardingDurationTicks: z.number().optional().describe("Duration in ticks"),
        allowedArea: z.object({
            id: z.string().optional(),
            name: z.string().optional(),
            points: z.array(Vector3Schema)
        }).optional().describe("Allowed operating area")
    })
}).describe("VBSS mission parameters");

export const MCMMissionSchema = z.object({
    type: z.literal('MCM').describe("Assign mine countermeasures mission"),
    params: z.object({
        method: z.string().optional().describe("MCM clearing method"),
        area: z.object({
            id: z.string().optional(),
            name: z.string().optional(),
            points: z.array(Vector3Schema)
        }).optional().describe("Area to sweep")
    })
}).describe("MCM mission parameters");

export const IdleMissionSchema = z.object({
    type: z.literal('Idle').describe("Assign idle mission")
}).describe("Idle mission");

export const MissionConfigSchema = z.discriminatedUnion('type', [
    InterceptMissionSchema,
    PatrolMissionSchema,
    StrikeMissionSchema,
    EscortMissionSchema,
    IdleMissionSchema,
    VBSSMissionSchema,
    MCMMissionSchema
]).describe("Mission configuration");

export const SetMissionSchema = z.object({
    type: z.literal('SetMission').describe("Assigns a new mission to a unit"),
    entityId: EntityIdSchema.describe("ID of the executing unit"),
    mission: MissionConfigSchema.describe("Mission configuration")
}).describe("Set mission command");

// --- Logistics Commands ---

export const SetLoadoutSchema = z.object({
    type: z.literal('SetLoadout').describe("Change weapon/fuel loadout (must be at facility)"),
    entityId: EntityIdSchema.describe("The unit ID"),
    loadout: z.string().describe("Loadout profile ID to apply")
}).describe("Set loadout");

export const LandAtFacilitySchema = z.object({
    type: z.literal('LandAtFacility').describe("Order aircraft to land at a facility"),
    entityId: EntityIdSchema.describe("The aircraft ID"),
    facilityId: EntityIdSchema.describe("The airbase or carrier ID")
}).describe("Land at facility");

export const LaunchAircraftSchema = z.object({
    type: z.literal('LaunchAircraft').describe("Launch a ready aircraft from its host facility"),
    entityId: EntityIdSchema.describe("The aircraft ID to launch")
}).describe("Launch aircraft");

export const TransferResourcesSchema = z.object({
    type: z.literal('TransferResources').describe("Transfer fuel between units"),
    fromId: EntityIdSchema.describe("Source unit ID"),
    toId: EntityIdSchema.describe("Recipient unit ID"),
    fuelKg: z.number().describe("Fuel to transfer in kilograms")
}).describe("Transfer resources");

export const ApplyDamageSchema = z.object({
    type: z.literal('ApplyDamage').describe("Manually apply damage to a unit"),
    entityId: EntityIdSchema.describe("The unit ID"),
    damage: z.number().describe("Damage amount")
}).describe("Apply damage");

export const DestroyEntitySchema = z.object({
    type: z.literal('DestroyEntity').describe("Immediately destroy a unit"),
    entityId: EntityIdSchema.describe("The unit ID")
}).describe("Destroy entity");

// --- Simulation Control Commands ---

export const SpawnEntitySchema = z.object({
    type: z.literal('SpawnEntity').describe("Spawn a new entity from a profile"),
    id: z.string().describe("ID for the new entity"),
    profileId: z.string().describe("Platform profile ID"),
    side: SideSchema.describe("Side assignment"),
    position: Vector3Schema.describe("Spawn coordinates"),
    heading: z.number().describe("Initial heading in degrees"),
    speedKts: z.number().optional().describe("Initial speed in knots")
}).describe("Spawn entity");

export const SetEnvironmentSchema = z.object({
    type: z.literal('SetEnvironment').describe("Modify environmental conditions"),
    key: z.string().describe("Environmental parameter name"),
    value: z.number().describe("New parameter value")
}).describe("Set environment parameter");

export const SetSimulationSpeedSchema = z.object({
    type: z.literal('SetSimulationSpeed').describe("Set simulation speed and pause state"),
    timeCompression: z.number().min(0).max(100).describe("Time compression factor (1=realtime, 0=paused)"),
    isPaused: z.boolean().optional().describe("Explicit pause state")
}).describe("Set simulation speed");

// --- Intent Command ---

import { ScenarioIntentSchema } from './scenarios.schema.js';

export const SetIntentSchema = z.object({
    type: z.literal('SetIntent').describe("Set a high-level scenario automation intent"),
    intent: ScenarioIntentSchema.describe("The scenario intent payload")
}).describe("Set scenario intent");

// ─── Master Command Union ────────────────────────────────────────────────────

/**
 * EngineCommandPayload: The discriminated union of ALL possible engine commands.
 * This is the single source of truth for command dispatch.
 */
export const EngineCommandPayloadSchema = z.discriminatedUnion('type', [
    // Navigation
    SetCourseSchema,
    AddWaypointSchema,
    ClearWaypointsSchema,
    SetHeadingSchema,
    SetSpeedSchema,
    SetAltitudeSchema,
    JoinFormationSchema,
    BreakFormationSchema,
    // Sensors
    AddDetectionSchema,
    SetSensorStateSchema,
    SetEMCONSchema,
    // Combat
    FireWeaponSchema,
    AssignWeaponSchema,
    // Doctrine
    SetUnitROESchema,
    SetGlobalROESchema,
    SetMissionROESchema,
    UpdateWRARulesSchema,
    // Missions
    SetMissionSchema,
    // Logistics
    SetLoadoutSchema,
    LandAtFacilitySchema,
    LaunchAircraftSchema,
    TransferResourcesSchema,
    ApplyDamageSchema,
    DestroyEntitySchema,
    // Simulation
    SpawnEntitySchema,
    SetEnvironmentSchema,
    SetSimulationSpeedSchema,
    SetIntentSchema
]).describe("Engine command payload");
export type EngineCommandPayload = z.infer<typeof EngineCommandPayloadSchema>;

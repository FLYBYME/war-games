/**
 * Engine V3 Core Types
 * 
 * IMPORTANT: This file is the bridge between the engine and the V2 SDK.
 * All domain types, enums, and schemas are defined in the V2 contracts
 * and re-exported here for engine consumption.
 * 
 * The engine MUST NOT import from sdk/schemas (V1) directly.
 * All imports flow through: sdk_v2/contracts/domain → engine/core/Types
 */

// Primitives: Vector3, Lla, Side, EntityId, Area, GeoJSON, MapRegion
export * from '../../sdk_v2/contracts/domain/primitives.schema.js';

// Sensor enums: SensorType, EMBand, SensorMode, MountingType, EMCONState
export * from '../../sdk_v2/contracts/domain/sensor.schema.js';

// Tactical: ROE, Tracks, Missions, Profiles, Weapons, WRA, Formations
export * from '../../sdk_v2/contracts/domain/tactical.schema.js';

// Events: SimulationEvent, TacticalEvent, EntitySpawned, etc.
export * from '../../sdk_v2/contracts/domain/events.schema.js';

// Commands: EngineCommandPayload discriminated union
export * from '../../sdk_v2/contracts/domain/commands.schema.js';

// Scenarios: Triggers, Assertions, Intents, ScenarioManifest
export * from '../../sdk_v2/contracts/domain/scenarios.schema.js';

// ViewState: UI projection models (ViewUnitPayload, ViewTrackPayload, etc.)
export * from '../../sdk_v2/contracts/domain/viewstate.schema.js';

/**
 * V2 Domain Schemas — Single Source of Truth
 *
 * All domain types, enums, and Zod schemas are defined here.
 * The engine, server, SDK, and AI agents all import from this barrel.
 */

// Primitives: Vector3, Lla, Side, EntityId, GeoJSON, MapRegion
export * from './primitives.schema.js';

// Sensor enums: SensorType, EMBand, SensorMode, MountingType, EMCONState
export * from './sensor.schema.js';

// Tactical: ROE, Tracks, Missions, Profiles, Weapons, WRA, Formations
export * from './tactical.schema.js';

// Events: SimulationEvent, EntitySpawned, WeaponFired, DamageDealt, etc.
export * from './events.schema.js';

// Commands: EngineCommandPayload discriminated union
export * from './commands.schema.js';

// Scenarios: Triggers, Assertions, Intents, ScenarioManifest
export * from './scenarios.schema.js';

// ViewState: UI projection models (ViewUnitPayload, ViewTrackPayload, etc.)
export * from './viewstate.schema.js';

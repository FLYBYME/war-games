/**
 * V2 Contracts — Master Barrel Export
 * 
 * This is the single import point for all V2 contracts.
 * Consumers import from here to get:
 *   - Domain schemas (types, enums, Zod schemas)
 *   - Tool contracts (input/output schemas + REST metadata)
 *   - Tool infrastructure (ToolContract, ContractRegistry, defineContract)
 */

// ─── Domain Schemas ──────────────────────────────────────────────────────────
export * from './domain/index.js';

// ─── Infrastructure ──────────────────────────────────────────────────────────
export * from './core/tool_contract.js';

// ─── Match Domain ────────────────────────────────────────────────────────────
export * from './match/match.schema.js';
export * from './match/match_list.js';

// ─── Simulation Control ──────────────────────────────────────────────────────
export * from './sim/sim.contracts.js';

// ─── Entity Management ──────────────────────────────────────────────────────
export * from './entity/entity.contracts.js';

// ─── Kinematics ──────────────────────────────────────────────────────────────
export * from './kinematics/kinematics.contracts.js';

// ─── Navigation ──────────────────────────────────────────────────────────────
export * from './nav/nav.contracts.js';

// ─── Sensor Domain ───────────────────────────────────────────────────────────
export * from './sensor/sensor.contracts.js';

// ─── Track Domain ────────────────────────────────────────────────────────────
export * from './track/track.contracts.js';

// ─── Combat Domain ───────────────────────────────────────────────────────────
export * from './combat/combat.contracts.js';

// ─── Mission Domain ──────────────────────────────────────────────────────────
export * from './mission/mission.contracts.js';

// ─── Logistics Domain ────────────────────────────────────────────────────────
export * from './logistics/logistics.contracts.js';

// ─── Side Domain ─────────────────────────────────────────────────────────────
export * from './side/side.contracts.js';

// ─── Group Domain ────────────────────────────────────────────────────────────
export * from './group/group.contracts.js';

// ─── Electronic Warfare ──────────────────────────────────────────────────────
export * from './ew/ew.contracts.js';

// ─── Propulsion Domain ──────────────────────────────────────────────────────
export * from './propulsion/propulsion.contracts.js';

// ─── Guidance Domain ─────────────────────────────────────────────────────────
export * from './guidance/guidance.contracts.js';

// ─── Signatures & Countermeasures ────────────────────────────────────────────
export * from './signature/signature.contracts.js';

// ─── Environment Domain ──────────────────────────────────────────────────────
export * from './env/env.contracts.js';

// ─── Map & Geospatial ────────────────────────────────────────────────────────
export * from './map/map.contracts.js';

// ─── Worker Management ───────────────────────────────────────────────────────
export * from './worker/worker.contracts.js';

// ─── Datalink ────────────────────────────────────────────────────────────────
export * from './datalink/datalink.contracts.js';

// ─── Orbital ─────────────────────────────────────────────────────────────────
export * from './orbital/orbital.contracts.js';

// ─── Ministry ────────────────────────────────────────────────────────────────
export * from './ministry/ministry.contracts.js';

// ─── Automation ──────────────────────────────────────────────────────────────
export * from './automation/automation.contracts.js';

// ─── Bug Reporting ───────────────────────────────────────────────────────────
export * from './bug/bug.contracts.js';

// ─── Global Registry (DB) ────────────────────────────────────────────────────
export * from './db/db.contracts.js';

// ─── History & Analytics ─────────────────────────────────────────────────────
export * from './history/history.contracts.js';

// ─── Agent Service ───────────────────────────────────────────────────────────
export * from './agent/agent.contracts.js';

// ─── QA & Diagnostic Tools ───────────────────────────────────────────────────
export * from './qa/qa.contracts.js';

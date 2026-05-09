# Server V2 & SDK V2: Tool-First Architecture Plan (Analytics-Optimized)

## Objective
Establish a clean, modern, and formal v2 architecture by creating `src/server_v2` and `src/sdk_v2`. The core of the V2 system is the **Unified Tool Contract**. Every action and query in the system is defined as a `WarGamesTool`. 

Designed specifically for Operations Research and batch tactical simulation (e.g., 200 concurrent headless runs over 2-hour sim times), this architecture prioritizes high-throughput telemetry logging, zero-overhead execution, and embedded OLAP (Online Analytical Processing) for After Action Reviews. 

This approach ensures total parity between the REST API, the SDK, the UI, and AI Agents (LLM/MCP), with centralized Zod validation and full type safety.

---

## Core Architectural Pillars

1. **The Contract is the Source of Truth**: Every system capability is defined in `src/sdk_v2/contracts` using a purely descriptive interface (Zod schemas + REST metadata). 
2. **Decoupled Server Implementation**: The actual execution logic (`call()`) lives securely in `src/server_v2/tools`, preventing any server-side ECS engine code from leaking into the frontend bundle.
3. **Automated API Registration**: The V2 Server automatically generates Fastify routes by iterating over the Server Tool Registry, mapping request payloads/params automatically to the Zod schemas.
4. **Generated SDK (Zero-Leak)**: Instead of runtime proxies, a build script generates a pristine, standalone TypeScript client using mapped types. This provides 100% type-safe IDE autocomplete with zero dependencies.
5. **Hybrid Analytics Persistence**: 
    * **Relational (SQLite)**: Used exclusively for the Global Registry (Profiles, Weapon Specs, Scenarios).
    * **Hot Path (In-Memory)**: The Live ECS state runs entirely in RAM via `EntityManager` and `SpatialGrid` for maximum tick performance.
    * **Analytics (Parquet + DuckDB)**: `Tracer` and `TelemetrySystem` stream output directly to local `.parquet` files. The API queries these files at memory-speed using an embedded DuckDB engine.
6. **Domain-Action Naming**: Tools follow a strict `domain_action_subaction` convention for discoverability.
7. **Decoupled Terrain Engine (Workers)**: High-latency geospatial tasks (tile fetching, decompression, LOS math) are offloaded to a pool of background `TerrainWorkers`. The API remains non-blocking while processing global SRTM data.

---

## Terrain & Geospatial Engine (V2)

To support global simulation without stalling the main tick loop, the V2 architecture utilizes a dedicated service layer for terrain:

*   **TerrainService**: Manages a pool of Node.js `worker_threads`.
*   **TerrainWorker**: A specialized worker (`terrain.worker.ts`) that:
    1.  Fetches SRTM (HGT) tiles from AWS Skadi S3.
    2.  Decompresses GZIP streams on-the-fly.
    3.  Samples data at multiple resolutions (1201x1201 for Engine, 256x256 for UI).
    4.  Encodes into `WgtFormat` for fast simulation access.
*   **WgtCache**: An LRU (Least Recently Used) cache for processed terrain tiles to minimize AWS egress and latency.

---

## The Hybrid Persistence Layer

To support massive batch-simulation without database bottlenecks, the persistence architecture is strictly divided by use-case:

### 1. Global Registry (SQLite + Drizzle ORM)
* Handles `db_` tools (Profiles, Scenarios, Weapon Registries).
* Uses standard SQL normalization mapped via Drizzle ORM.

### 2. Telemetry & Analytics (Parquet + DuckDB)
* **Write Phase**: During a headless match run, `TelemetrySystem.ts` writes state deltas directly to `/data/runs/{batchId}/` as `.parquet` files. No database connections are used during the hot loop.
* **Read Phase**: When the UI or AI calls `history_get_heatmap` or `history_list_events`, the tool utilizes an embedded Node DuckDB instance to query the massive Parquet files directly via SQL. 

---

## The Unified Tool Interface (Split Architecture)

To ensure the client SDK can be compiled without importing the server engine, the architecture splits the "Contract" from the "Implementation".

### 1. The Shared Contract (Safe for UI/SDK)
```typescript
// src/sdk_v2/contracts/entity/entity_get_position.ts
import { z } from "zod";

export const EntityGetPositionInput = z.object({
    matchId: z.string().describe("The unique ID of the match"),
    entityId: z.string().describe("The unique ID of the entity")
});

export const EntityGetPositionOutput = z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
    heading: z.number(),
    pitch: z.number()
});

export const entityGetPositionContract = {
    domain: "entity",
    action: "get_position",
    description: "Get the current 3D position and orientation of an entity.",
    inputSchema: EntityGetPositionInput,
    outputSchema: EntityGetPositionOutput,
    rest: {
        method: 'GET' as const,
        path: '/matches/:matchId/entities/:entityId/position'
    }
};

```

### 2. The Server Implementation (Strictly Backend)

```typescript
// src/server_v2/tools/entity/entity_get_position.ts
import { defineTool } from '../../core/ToolBuilder';
import { entityGetPositionContract } from '@sdk/contracts/entity/entity_get_position';
import { TransformComponent } from '@engine/components/Physics';

export const entity_get_position = defineTool(entityGetPositionContract, async (input, ctx) => {
    const world = ctx.app.matchService.getMatch(input.matchId);
    const entity = world.getEntity(input.entityId);
    const transform = entity.getComponent(TransformComponent);
    
    return {
        x: transform.position.x,
        y: transform.position.y,
        z: transform.position.z,
        heading: transform.heading,
        pitch: transform.pitch
    };
});

```

### 3. The Analytics Tool Example (DuckDB)

```typescript
// src/server_v2/tools/history/history_get_heatmap.ts
import { defineTool } from '../../core/ToolBuilder';
import { historyGetHeatmapContract } from '@sdk/contracts/history/history_get_heatmap';

export const history_get_heatmap = defineTool(historyGetHeatmapContract, async (input, ctx) => {
    // DuckDB queries the raw telemetry files generated by the headless sim workers
    const query = `
        SELECT 
            round(pos_x, -2) as grid_x, 
            round(pos_y, -2) as grid_y, 
            count(*) as density
        FROM read_parquet('/data/runs/${input.batchId}/*.parquet')
        WHERE entity_type = '${input.entityType}'
        GROUP BY grid_x, grid_y
    `;
    return await ctx.app.duckDB.all(query);
});

```

---

## Automated SDK Generation (V2)

The SDK utilizes a build-time code generator rather than a runtime proxy. This ensures the frontend UI and external AI scripts remain lightweight and completely decoupled from the server environment.

```bash
# Build command analyzes the Contract Registry and outputs a standalone file
npm run generate:sdk

```

```typescript
// Generated Output: src/sdk_v2/generated/WarGamesClient.ts

export class WarGamesClientV2 {
    constructor(private baseUrl: string) {}

    public readonly api = {
        entity: {
            get_position: async (args: z.infer<typeof EntityGetPositionInput>) => {
                return this.request('GET', `/matches/${args.matchId}/entities/${args.entityId}/position`, args);
            }
        },
        history: {
            get_heatmap: async (args: z.infer<typeof HistoryGetHeatmapInput>) => {
                return this.request('GET', `/history/heatmap`, args);
            }
        }
        // ... all 90+ tools mapped perfectly for IDE autocomplete
    };
    
    private async request(...) { /* Standard fetch wrapper */ }
}

```

---

## Tool & Endpoint Specification (V2)

*(All endpoints are automatically registered in Fastify by iterating over the Server Tool Registry)*

### 1. Match Management (`match_`)

Based on `src/server/services/MatchService.ts` and the SQLite `matches` table. This domain handles the lifecycle of simulation sessions, bridging the gap between persistent scenario templates and active memory-resident worlds.

* **`match_list`**: `GET /api/v2/matches`
* *Why:* Fetch all active and archived matches for the global dashboard.

* **`match_create`**: `POST /api/v2/matches` (Load scenario, init headless workers)
* *Why:* Bootstrap a new simulation instance from a scenario template, initializing the `EntityManager`.

* **`match_get`**: `GET /api/v2/matches/:matchId`
* *Why:* Retrieve the high-level metadata and current status of a specific match.

* **`match_update`**: `PATCH /api/v2/matches/:matchId`
* *Why:* Modify operational parameters like match name, tags, or execution state.

* **`match_delete`**: `DELETE /api/v2/matches/:matchId`
* *Why:* Terminate an active match and purge its transient state from the server.

* **`match_get_win_state`**: `GET /api/v2/matches/:matchId/win-state`
* *Why:* Evaluate victory conditions based on the current ECS state (e.g., survival ratios).

* **`match_set_intent`**: `PUT /api/v2/matches/:matchId/intent`
* *Why:* Inject high-level strategic goals that the AI "Ministries" use for evaluation.


### 2. Simulation Control (`sim_`)

Based on `engine/core/EntityManager.ts` and the `SimulationLoop`. These tools provide direct, low-level control over the progression of time within a specific match.

* **`sim_get`**: `GET /api/v2/matches/:matchId/simulation`
* *Why:* Check the current simulation tick, time scale, and running status (Paused vs Running).

* **`sim_step`**: `POST /api/v2/matches/:matchId/simulation/step`
* *Why:* Manually advance the simulation by one or more ticks, essential for debugging and discrete time agents.

* **`sim_update`**: `PATCH /api/v2/matches/:matchId/simulation`
* *Why:* Adjust the execution speed (time scale) or toggle the paused state.

* **`sim_get_stream`**: `GET /api/v2/matches/:matchId/simulation/stream` (SSE for UI monitoring)
* *Why:* Provide a real-time Server-Sent Events (SSE) feed for UI visualization and live telemetry.


### 3. Side Control (`side_`)

Based on `engine/components/Doctrine.ts` and `engine/systems/DoctrineSystem.ts`. This domain manages faction-wide behavior rules.

* **`side_get_roe`**: `GET /api/v2/matches/:matchId/sides/:side/roe`
* *Why:* Retrieve the current Rules of Engagement for a specific side (e.g., Blue, Red).

* **`side_update_roe`**: `PATCH /api/v2/matches/:matchId/sides/:side/roe`
* *Why:* Dynamically change faction behavior (e.g., switching from "Tight" to "Free" weapons release).


### 4. Entity Core (`entity_`)

Based on `engine/core/EntityManager.ts` and `engine/components/Health.ts`. These tools handle the fundamental CRUD operations for tactical units.

* **`entity_list`**: `GET /api/v2/matches/:matchId/entities`
* *Why:* List all entities currently active in the world for a specific match.

* **`entity_create`**: `POST /api/v2/matches/:matchId/entities` (Spawn via CommandDispatcher)
* *Why:* Programmatically spawn new units into the simulation using the `CommandDispatcher`.

* **`entity_get`**: `GET /api/v2/matches/:matchId/entities/:entityId`
* *Why:* Fetch the full component manifest and state for a single unit.

* **`entity_update`**: `PATCH /api/v2/matches/:matchId/entities/:entityId`
* *Why:* Batch update entity metadata or tags.

* **`entity_delete`**: `DELETE /api/v2/matches/:matchId/entities/:entityId`
* *Why:* Remove a unit from the simulation (different from "destroying" it via damage).

* **`entity_get_status`**: `GET /api/v2/matches/:matchId/entities/:entityId/status`
* *Why:* Quick check for operational status (Alive, Destroyed, Out of Fuel).


### 5. Kinematics (`kinematics_`)

Based on `engine/components/Physics.ts` and `engine/systems/PhysicsSystem.ts`. Handles the raw physical state of units.

* **`kinematics_get`**: `GET /api/v2/matches/:matchId/entities/:entityId/kinematics`
* *Why:* Retrieve high-fidelity position, velocity, and orientation data.

* **`kinematics_update`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/kinematics`
* *Why:* Adjust velocity or heading vectors directly.

* **`kinematics_set_position`**: `PUT /api/v2/matches/:matchId/entities/:entityId/kinematics/position`
* *Why:* Instantly teleport a unit to a new coordinate (e.g., for scenario resetting).

* **`kinematics_apply_force`**: `POST /api/v2/matches/:matchId/entities/:entityId/kinematics/force`
* *Why:* Apply an impulse or continuous force to a unit, bypassing the propulsion system.


### 6. Combat (`combat_`)

Based on `engine/components/Combat.ts`, `engine/systems/CombatSystem.ts`, and `engine/systems/WeaponStageSystem.ts`. Orchestrates engagement logic and weapon release.

*(Note: Mutating tools translate inputs into `ICommand` objects and send them to the `CommandDispatcher` rather than mutating ECS components directly).*

* **`combat_get`**: `GET /api/v2/matches/:matchId/entities/:entityId/combat`
* *Why:* View current engagement targets, weapon status, and ammo counts.

* **`combat_fire`**: `POST /api/v2/matches/:matchId/entities/:entityId/combat/fire`
* *Why:* Issue a manual fire command against a specific track or location.

* **`combat_fire_salvo`**: `POST /api/v2/matches/:matchId/entities/:entityId/combat/salvo`
* *Why:* Execute a multi-weapon launch sequence.

* **`combat_detonate`**: `POST /api/v2/matches/:matchId/entities/:entityId/combat/detonate`
* *Why:* Force a warhead to explode, triggering the `CollisionSystem`'s damage logic.

* **`combat_list_mounts`**: `GET /api/v2/matches/:matchId/entities/:entityId/combat/mounts`
* *Why:* Inspect turret/launcher configurations and their current slew angles.

* **`combat_update_mount_slew`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/combat/mounts/:index/slew`
* *Why:* Manually point a turret or sensor mount.

* **`combat_assign_weapon`**: `POST /api/v2/matches/:matchId/entities/:entityId/combat/assign`
* *Why:* Link a specific weapon system to a target track.

* **`combat_get_wra`**: `GET /api/v2/matches/:matchId/entities/:entityId/combat/wra`
* *Why:* Retrieve Weapon Release Authority settings (e.g., range gates, salvo size).

* **`combat_update_wra`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/combat/wra`
* *Why:* Adjust automated engagement constraints.

* **`combat_update_roe`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/combat/roe`
* *Why:* Override unit-specific Rules of Engagement.

* **`combat_next_stage`**: `POST /api/v2/matches/:matchId/entities/:entityId/combat/stage/next`
* *Why:* Manually advance a multi-stage weapon (e.g., booster separation).

* **`combat_update_stage_ticks`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/combat/stage`
* *Why:* Adjust the timing for weapon stage transitions.


### 7. Sensors (`sensor_`)

Based on `engine/components/Sensors.ts` and `engine/systems/SensorSystem.ts`. Manages active and passive detection systems.

* **`sensor_list`**: `GET /api/v2/matches/:matchId/entities/:entityId/sensors`
* *Why:* List all onboard sensors (Radar, Sonar, IRST) and their settings.

* **`sensor_update`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/sensors/:index`
* *Why:* Modify sensor properties like gain, scan mode, or power state.

* **`sensor_update_scan`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/sensors/:index/scan`
* *Why:* Adjust active scan sectors or beam patterns.

* **`sensor_set_emcon`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/sensors/emcon`
* *Why:* Set Emission Control levels (e.g., "Silent" vs "Active").

* **`sensor_add_detection`**: `POST /api/v2/matches/:matchId/entities/:entityId/sensors/detections`
* *Why:* Inject a synthetic detection (e.g., for third-party track hand-off).

* **`sensor_delete_detection`**: `DELETE /api/v2/matches/:matchId/entities/:entityId/sensors/detections/:targetId`
* *Why:* Manually purge a detection from the sensor's track buffer.

* **`sensor_sync_esm`**: `PUT /api/v2/matches/:matchId/entities/:entityId/sensors/esm`
* *Why:* Synchronize Electronic Support Measures data across the network.


### 8. Tracks (`track_`)

Based on `engine/components/Track.ts` and `engine/systems/TrackManagementSystem.ts`. Manages the "Fused Picture" of the tactical environment.

* **`track_list`**: `GET /api/v2/matches/:matchId/tracks`
* *Why:* Retrieve the list of all tracks known to a specific side.

* **`track_create`**: `POST /api/v2/matches/:matchId/tracks`
* *Why:* Manually create a fused track from multiple detection sources.

* **`track_get`**: `GET /api/v2/matches/:matchId/tracks/:trackId`
* *Why:* Get detailed classification and position history for a track.

* **`track_update`**: `PATCH /api/v2/matches/:matchId/tracks/:trackId`
* *Why:* Manually update track classification (e.g., "Unknown" to "Hostile").

* **`track_delete`**: `DELETE /api/v2/matches/:matchId/tracks/:trackId`
* *Why:* Remove a track from the side's common operational picture.

* **`track_sync`**: `PUT /api/v2/matches/:matchId/tracks`
* *Why:* Force a synchronization update across all units on a side.


### 9. Navigation (`nav_`)

Based on `engine/components/Navigation.ts`, `engine/systems/WaypointSystem.ts`, and `engine/systems/FormationSystem.ts`. Controls movement and pathing logic.

* **`nav_get`**: `GET /api/v2/matches/:matchId/entities/:entityId/navigation`
* *Why:* Check current destination, course, and autopilot mode.

* **`nav_update`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/navigation`
* *Why:* Adjust cruise speed, altitude, or turn rates.

* **`nav_list_waypoints`**: `GET /api/v2/matches/:matchId/entities/:entityId/navigation/waypoints`
* *Why:* Retrieve the active flight plan or route.

* **`nav_add_waypoint`**: `POST /api/v2/matches/:matchId/entities/:entityId/navigation/waypoints`
* *Why:* Append a new waypoint to the unit's path.

* **`nav_clear_waypoints`**: `DELETE /api/v2/matches/:matchId/entities/:entityId/navigation/waypoints`
* *Why:* Stop current movement and clear the route.

* **`nav_join_formation`**: `POST /api/v2/matches/:matchId/entities/:entityId/navigation/formation`
* *Why:* Attach the unit to a leader for collective movement.

* **`nav_set_formation`**: `PUT /api/v2/matches/:matchId/entities/:entityId/navigation/formation`
* *Why:* Update the unit's relative position within a formation.

* **`nav_break_formation`**: `DELETE /api/v2/matches/:matchId/entities/:entityId/navigation/formation`
* *Why:* Detach the unit from its formation and resume independent navigation.


### 10. Missions (`mission_`)

Based on `engine/components/Missions.ts` and `engine/systems/MissionSystem.ts`. High-level autonomous behavior management.

* **`mission_list`**: `GET /api/v2/matches/:matchId/entities/:entityId/missions`
* *Why:* List all active and queued missions for a unit.

* **`mission_create`**: `POST /api/v2/matches/:matchId/entities/:entityId/missions`
* *Why:* Assign a new high-level objective (e.g., Patrol, Escort, Strike).

* **`mission_update_roe`**: `PATCH /api/v2/matches/:matchId/missions/:missionId/roe`
* *Why:* Update mission-specific operational constraints.

* **`mission_get_tasks`**: `GET /api/v2/matches/:matchId/entities/:entityId/tasks`
* *Why:* Inspect the low-level tasks generated by the mission system (e.g., `OrbitTask`).


### 11. Logistics & Health (`logistics_`)

Based on `engine/components/Logistics.ts`, `engine/components/Health.ts`, and their respective systems. Manages physical constraints and damage.

* **`logistics_get`**: `GET /api/v2/matches/:matchId/entities/:entityId/logistics`
* *Why:* Check fuel levels, ammunition inventory, and structural integrity.

* **`logistics_update_state`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/logistics/state`
* *Why:* Manually set fuel or ammo levels (e.g., for mid-mission replenishment).

* **`logistics_transfer`**: `POST /api/v2/matches/:matchId/logistics/transfer`
* *Why:* Execute fuel or cargo transfer between two entities.

* **`logistics_consume_fuel`**: `POST /api/v2/matches/:matchId/entities/:entityId/logistics/fuel/consume`
* *Why:* Manually deduct fuel (e.g., to simulate environmental drag or malfunctions).

* **`logistics_set_loadout`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/logistics/loadout`
* *Why:* Change the weapon/sensor configuration of a unit.

* **`logistics_land`**: `POST /api/v2/matches/:matchId/entities/:entityId/logistics/land`
* *Why:* Trigger a recovery sequence at a friendly base or carrier.

* **`logistics_launch`**: `POST /api/v2/matches/:matchId/entities/:entityId/logistics/launch`
* *Why:* Deploy a stored unit from its parent platform.

* **`logistics_apply_damage`**: `POST /api/v2/matches/:matchId/entities/:entityId/logistics/damage`
* *Why:* Inflict damage to a unit's primary health pool.

* **`logistics_apply_subsystem_damage`**: `POST /api/v2/matches/:matchId/entities/:entityId/logistics/health/subsystems/:subId/damage`
* *Why:* Targeted damage to specific components (e.g., Radar, Engines).

* **`logistics_set_condition`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/logistics/condition`
* *Why:* Set overarching status flags (e.g., "Inoperable", "Critical").


### 12. Environment (`env_`)

Based on `engine/components/Environment.ts` and the `TerrainService`. Manages world-state variables and physical terrain data.

* **`env_get`**: `GET /api/v2/matches/:matchId/environment`
* *Why:* Retrieve global environmental data (Time of day, Sea state, Wind).

* **`env_update`**: `PATCH /api/v2/matches/:matchId/environment`
* *Why:* Modify global conditions dynamically.

* **`env_sample_terrain`**: `GET /api/v2/matches/:matchId/environment/terrain`
* *Why:* Query terrain elevation or type at a specific coordinate.

* **`env_prefetch_terrain`**: `POST /api/v2/env/terrain/prefetch`
* *Why:* Command workers to cache tiles for a bounding box before a match starts.

* **`env_get_cache_stats`**: `GET /api/v2/env/terrain/cache`
* *Why:* Monitor disk/RAM usage of processed terrain tiles.

* **`env_clear_cache`**: `DELETE /api/v2/env/terrain/cache`
* *Why:* Force-refresh terrain data.

* **`env_sample_atmosphere`**: `GET /api/v2/env/atmosphere`
* *Why:* Query air density and wind vectors for flight modeling.

* **`env_create_layer`**: `POST /api/v2/matches/:matchId/env/layers`
* *Why:* Define dynamic areas like weather fronts or localized jamming clouds.

* **`env_update_layer`**: `PATCH /api/v2/matches/:matchId/env/layers/:layerId`
* *Why:* Move or resize dynamic environmental layers.

* **`env_get_borders`**: `GET /api/v2/matches/:matchId/environment/borders`
* *Why:* Fetch geopolitical boundaries and restricted zones.

* **`env_sample_ocean`**: `GET /api/v2/matches/:matchId/environment/ocean`
* *Why:* Retrieve localized Sound Speed Profiles (SSP), salinity, and thermocline depth for sonar modeling.

* **`env_set_time`**: `PUT /api/v2/matches/:matchId/environment/time`
* *Why:* Adjust the simulation clock (affects solar/lunar position and visual/IR sensor performance).


### 13. History & Analytics (`history_`)

Based on `engine/systems/TelemetrySystem.ts` and the DuckDB Parquet storage layer. High-throughput data extraction for AAR.

*(Powered by DuckDB querying batch Parquet files)*

* **`history_list_telemetry`**: `GET /api/v2/history/:batchId/telemetry/:entityId`
* *Why:* Fetch the full time-series position and state data for a unit across a run.

* **`history_get_heatmap`**: `GET /api/v2/history/:batchId/heatmap/:entityId`
* *Why:* Generate spatial density maps using DuckDB's fast Parquet scanning.

* **`history_list_events`**: `GET /api/v2/history/:batchId/events`
* *Why:* List all discrete simulation events (Fires, Hits, Destructions) for a batch.

* **`history_get_losses`**: `GET /api/v2/history/:batchId/losses`
* *Why:* Calculate attrition rates and loss-exchange ratios.

* **`history_aggregate_metrics`**: `GET /api/v2/history/:batchId/metrics` (Cross-scenario KPI aggregation)
* *Why:* Compute statistical KPIs (e.g., Pk - Probability of Kill) across hundreds of Monte Carlo runs.


### 14. Global Registry (`db_`)

Based on the SQLite + Drizzle ORM persistence layer. Manages the library of static simulation definitions.

*(Powered by SQLite + Drizzle ORM)*

* **`db_profile_list`**: `GET /api/v2/db/profiles`
* *Why:* List all available unit profiles (e.g., F-16 Block 50, Arleigh Burke).

* **`db_profile_create`**: `POST /api/v2/db/profiles`
* *Why:* Add a new unit definition to the registry.

* **`db_profile_get`**: `GET /api/v2/db/profiles/:id`
* *Why:* Retrieve the full specification for a unit type.

* **`db_profile_update`**: `PATCH /api/v2/db/profiles/:id`
* *Why:* Modify existing unit profiles.

* **`db_profile_delete`**: `DELETE /api/v2/db/profiles/:id`
* *Why:* Remove a unit profile from the library.

* **`db_weapon_list`**: `GET /api/v2/db/weapons`
* *Why:* List all modeled weapon systems.

* **`db_weapon_create`**: `POST /api/v2/db/weapons`
* *Why:* Register a new weapon (Missile, Bomb, Gun) with the system.

* **`db_weapon_get`**: `GET /api/v2/db/weapons/:id`
* *Why:* Fetch weapon performance envelopes and seeker specs.

* **`db_weapon_update`**: `PATCH /api/v2/db/weapons/:id`
* *Why:* Update weapon performance data.

* **`db_weapon_delete`**: `DELETE /api/v2/db/weapons/:id`
* *Why:* Remove a weapon definition.

* **`db_scenario_list`**: `GET /api/v2/db/scenarios`
* *Why:* List all stored scenario templates.

* **`db_scenario_create`**: `POST /api/v2/db/scenarios`
* *Why:* Save a new scenario to the database.

* **`db_scenario_get`**: `GET /api/v2/db/scenarios/:id`
* *Why:* Load a scenario template for match initialization.

* **`db_scenario_update`**: `PATCH /api/v2/db/scenarios/:id`
* *Why:* Modify scenario metadata or triggers.

* **`db_scenario_delete`**: `DELETE /api/v2/db/scenarios/:id`
* *Why:* Purge a scenario template.


### 15. Debug (`debug_`)

Based on Node.js `process` metrics and `engine/core/EntityManager.ts` snapshotting. Low-level system introspection.

* **`debug_get_performance`**: `GET /api/v2/debug/:matchId/performance`
* *Why:* Monitor tick-latency, system execution times, and worker thread health.

* **`debug_get_memory`**: `GET /api/v2/debug/:matchId/memory`
* *Why:* Track ECS memory usage, heap fragmentation, and buffer bloat.

* **`debug_create_snapshot`**: `POST /api/v2/debug/:matchId/snapshot`
* *Why:* Capture the entire binary state of a match for later reproduction or inspection.



### 16. Electronic Warfare (`ew_`)

Based on `engine/components/ElectronicWarfare.ts`, EW is distinct enough from standard sensors (like radar/sonar) to warrant its own domain. You have `JammerComponent` and `SIGINTComponent` that require runtime manipulation.

* **`ew_get_jammer`**: `GET /api/v2/matches/:matchId/entities/:entityId/ew/jammer`
* *Why:* Fetch current power, frequency, bandwidth, and beam width.


* **`ew_set_jammer_state`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/ew/jammer/state`
* *Why:* Toggle `isActive`, switch `JammerMode` (Noise vs. Deceptive), and change `JammerType` (SOJ vs SPJ).


* **`ew_assign_jammer_target`**: `PUT /api/v2/matches/:matchId/entities/:entityId/ew/jammer/target`
* *Why:* Point a directional jammer at a specific `targetId`.


* **`ew_get_sigint`**: `GET /api/v2/matches/:matchId/entities/:entityId/ew/sigint`
* *Why:* Retrieve data from the `SIGINTComponent` (localized jammers based on `sensitivityDBm`).



### 17. Datalink & Network Management (`datalink_`)

Based on `engine/components/Datalink.ts`, entities share tracks over networks. You have EMCON (Emissions Control) endpoints under sensors, but Datalink needs specific network administration.

* **`datalink_get`**: `GET /api/v2/matches/:matchId/entities/:entityId/datalink`
* *Why:* View latency, queue depth, and current `networkId`.


* **`datalink_update_network`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/datalink/network`
* *Why:* Move an entity to a different `networkId` (e.g., from 'BLUE_FORCE_NET' to a localized strike network).


* **`datalink_set_emissions`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/datalink/emissions`
* *Why:* Independently toggle `canTransmit`, `canReceive`, and overall `isActive` status (crucial for stealth approaches).



### 18. Tactical Group Management (`group_`)

Based on `engine/components/Group.ts`, while you have `nav_join_formation` in your draft, you are missing the structural/administrative management of groups (leaders, members, spacing).

* **`group_list`**: `GET /api/v2/matches/:matchId/groups`
* **`group_get`**: `GET /api/v2/matches/:matchId/groups/:groupId`
* **`group_create`**: `POST /api/v2/matches/:matchId/groups`
* *Why:* Initialize a new `GroupComponent`.


* **`group_set_leader`**: `PUT /api/v2/matches/:matchId/groups/:groupId/leader`
* *Why:* Reassign the `leaderId` if the current lead entity is destroyed or detached.


* **`group_update_members`**: `PATCH /api/v2/matches/:matchId/groups/:groupId/members`
* *Why:* Add/remove `memberIds` to the Set.


* **`group_set_parameters`**: `PATCH /api/v2/matches/:matchId/groups/:groupId/parameters`
* *Why:* Adjust `spacingM` and operational `formation` type dynamically.



### 19. Orbital Mechanics (`orbital_`)

Based on `engine/components/Orbital.ts`, space assets operate on Keplerian elements rather than standard cartesian kinematics (XYZ/Heading/Pitch).

* **`orbital_get_elements`**: `GET /api/v2/matches/:matchId/entities/:entityId/orbital`
* **`orbital_update_elements`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/orbital`
* *Why:* Allow the UI/Sim to adjust altitude, inclination, RAAN, or eccentricity (e.g., if a satellite performs a station-keeping maneuver).


* **`orbital_predict_pass`**: `GET /api/v2/matches/:matchId/entities/:entityId/orbital/passes`
* *Why:* (Helpful utility) Predict when the satellite will have line-of-sight over a specific geographic bounding box, calculating from `epochTick`.



### 20. Strategic / Ministry Operations (`op_` or `ministry_`)

Based on `engine/systems/ministries/IMinistry.ts`, the simulation utilizes a top-down AI "Ministry" system that generates `DesiredState` evaluations. To analyze AI behavior or override it via UI, you need endpoints here.

* **`ministry_get_evaluation`**: `GET /api/v2/matches/:matchId/entities/:entityId/ministry/evaluation`
* *Why:* Expose the `DesiredState` (Objective ID, Target Position, Resource Needs) generated by the `evaluate()` method so the UI can draw intent lines or resource requests.


* **`ministry_update_doctrine`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/ministry/doctrine`
* *Why:* Inject `doctrineUpdates` dynamically to change how the ministry behaves (e.g., shifting a Ministry of Strike from conservative to aggressive).


### 21. Propulsion & Engine Control (`propulsion_`)

Based on `engine/components/Propulsion.ts` and `engine/systems/PropulsionSystem.ts`. While `logistics_` tracks fuel volume, this domain provides granular control over the physical engine state.

* **`propulsion_get`**: `GET /api/v2/matches/:matchId/entities/:entityId/propulsion`
* *Why:* Fetch real-time throttle settings, current thrust (Newtons), and engine state (Off, Dry, Afterburner).

* **`propulsion_update`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/propulsion`
* *Why:* Manually adjust throttle or toggle afterburners for testing or precise kinematics control.

* **`propulsion_set_state`**: `PUT /api/v2/matches/:matchId/entities/:entityId/propulsion/state`
* *Why:* Directly command engine startup, shutdown, or emergency cutoffs.


### 22. Guidance & Weapon Control (`guidance_`)

Based on `engine/components/Guidance.ts` and `engine/systems/GuidanceSystem.ts`. This domain manages the terminal homing logic for weapons (missiles, torpedoes, glide bombs) while they are in flight.

* **`guidance_get`**: `GET /api/v2/matches/:matchId/entities/:entityId/guidance`
* *Why:* Inspect lock-on status, seeker type (ARH, IR, SARH), and current track ID being followed.

* **`guidance_update`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/guidance`
* *Why:* Adjust seeker sensitivity, maneuverability limits (Max G), or re-acquire lock parameters.

* **`guidance_set_target`**: `PUT /api/v2/matches/:matchId/entities/:entityId/guidance/target`
* *Why:* Manually override the seeker's target ID, useful for mid-course guidance updates or simulated "buddy-lasing."


### 23. Signatures & Countermeasures (`signature_`)

Based on `engine/components/Signatures.ts`, `engine/components/Subsurface.ts`, and the Electronic Warfare suite. Manages the observability of units and their active defense measures.

* **`signature_get`**: `GET /api/v2/matches/:matchId/entities/:entityId/signature`
* *Why:* Fetch the current Radar Cross Section (RCS), Infra-Red (IR) signature, and Acoustic Source Level.

* **`signature_update`**: `PATCH /api/v2/matches/:matchId/entities/:entityId/signature`
* *Why:* Apply modifiers based on physical configuration (e.g., "Rig for Silent Running" or deploying external stores).

* **`cm_deploy`**: `POST /api/v2/matches/:matchId/entities/:entityId/countermeasures/deploy`
* *Why:* Manually trigger the release of Chaff, Flares, or Acoustic Decoys.

* **`cm_get_inventory`**: `GET /api/v2/matches/:matchId/entities/:entityId/countermeasures`
* *Why:* Check remaining counts for defensive expendables.


### 24. Scenario Automation & Scripting (`automation_`)

Based on `engine/systems/ScenarioAutomationSystem.ts`. This domain allows external control over the scripted logic and assertions defined within a scenario template.

* **`automation_list_events`**: `GET /api/v2/matches/:matchId/automation/events`
* *Why:* List all scenario events (e.g., "Spawn Red reinforcement at Tick 500") and their current status (Pending/Triggered).

* **`automation_trigger_event`**: `POST /api/v2/matches/:matchId/automation/events/:eventId/trigger`
* *Why:* Force-trigger a scenario event manually, bypassing its defined conditions (useful for regression testing).

* **`automation_get_results`**: `GET /api/v2/matches/:matchId/automation/assertions`
* *Why:* Retrieve the pass/fail results of all scenario assertions, critical for automated batch-simulation validation.


### 25. Map & Geospatial (`map_`)

Based on `src/math/GeoProjection.ts` and the `TerrainService`. Provides utility tools for mapping and spatial analysis.

* **`map_list_regions`**: `GET /api/v2/map/regions`
* *Why:* List all pre-defined geographic theaters and their WGS84 bounds.

* **`map_get_overlay`**: `GET /api/v2/map/overlays/:overlayId`
* *Why:* Fetch GeoJSON data for custom map layers (cities, airfields, political boundaries).

* **`map_get_los`**: `GET /api/v2/matches/:matchId/map/los`
* *Why:* Calculate Line-of-Sight (LOS) between two coordinates, accounting for terrain masking.

* **`map_get_elevation_profile`**: `GET /api/v2/map/elevation-profile`
* *Why:* Returns a sample array of elevation points between two coordinates (for TFR/Cruise missiles).

* **`map_convert_coordinates`**: `POST /api/v2/map/convert`
* *Why:* Utility to convert between Geodetic (LLA), ECEF, and Local Tangent Plane (ENU).

* **`map_check_visibility`**: `POST /api/v2/map/visibility-matrix`
* *Why:* Batch calculate LOS between a group of entities.

* **`map_calculate_distance`**: `GET /api/v2/map/distance`
* *Why:* Utility to compute geodesic distance and bearing between two LLH points.

* **`map_list_zones`**: `GET /api/v2/matches/:matchId/map/zones`
* *Why:* List active tactical zones (NFZ, WEZ, Inclusion/Exclusion).

* **`map_create_zone`**: `POST /api/v2/matches/:matchId/map/zones`
* *Why:* Programmatically define new tactical polygons.

* **`map_update_zone`**: `PATCH /api/v2/matches/:matchId/map/zones/:zoneId`
* *Why:* Dynamically resize or move tactical zones.

* **`map_get_units_in_zone`**: `GET /api/v2/matches/:matchId/map/zones/:zoneId/entities`
* *Why:* Spatial query to find all entities inside a specific tactical zone.


---

## Implementation Steps

1. **Setup V2 Core Folders**: Create `src/sdk_v2/contracts`, `src/server_v2/tools`, and `src/server_v2/core`.
2. **Implement Split Contract Architecture**: Move all Zod schemas and REST path definitions into the SDK contracts folder.
3. **Configure Persistence & Terrain**:
* Setup SQLite + Drizzle ORM for `db_` tools.
* Setup embedded DuckDB in the server instance for `history_` tools.
* **Setup TerrainService and Worker Pool** to handle background tile processing.
* Update `Tracer` / `TelemetrySystem` to stream batch output to `.parquet` locally.


4. **Build Server Router Middleware**: Create the Fastify auto-router that merges `req.params`, `req.query`, and `req.body` into a single object, parses it against the Contract `inputSchema`, and routes it to the `call()` implementation.
5. **Implement Command Translation**: Ensure mutating tools (`combat_fire`, `nav_add_waypoint`) map incoming DTOs to `ICommand` classes and pass them to the `CommandDispatcher`, keeping the engine pure.
6. **Create SDK Generator Script**: Build a script (e.g., using `zod-to-ts` or custom AST generation) that reads the `contracts` directory and outputs the static `WarGamesClientV2` class.
7. **Deploy SSE Sync Stream**: Implement Server-Sent Events for `sim_get_stream` to allow UIs to passively monitor headless progress.

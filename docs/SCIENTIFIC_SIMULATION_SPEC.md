# Scientific Simulation Architecture Specification (V2)

## 1. Vision & Core Philosophy
The War-Games engine is transitioning from a "game engine" architecture (frame-based, heuristic math, monolithic updates) to a **Scientific-Grade Simulation Tool**. 

This requires absolute determinism, strict isolation of state and logic, high-precision integration, and the ability to ingest real-world geospatial and atmospheric data without compromising the performance of the ECS (Entity Component System) core.

---

## 2. Completed Milestones (The Foundation)

Before the environmental and 6-DOF upgrades, the following architectural foundations were successfully established:

### 2.1 Metadata-First Data Model
* **Centralized Schema**: All entity properties are defined in `src/engine/meta/registry.ts`. This acts as the single source of truth.
* **Automated `WorldBuffer`**: Memory allocation (SharedArrayBuffers) is entirely dynamically generated based on the Metadata Schema, eliminating boilerplate and alignment errors.
* **Automated Hydration**: `EntityManager` populates entities directly from validated JSON without manual property mapping.
* **Auto-Dirty Flags**: The `ECSRegistry` proxy automatically triggers bitmask updates for network synchronization when properties are modified.

### 2.2 Pluggable Integration (Strategy Pattern)
* Physics integration was decoupled from the `KinematicsSystem`.
* Introduced `IKinematicsIntegrator` with swappable implementations:
    * **`EulerIntegrator`**: Fast, first-order integration for low-fidelity/massive-scale scenarios.
    * **`RK4Integrator`**: Runge-Kutta 4th Order integration. Samples four derivatives per timestep to eliminate integration drift, essential for orbital and long-range ballistic trajectories.

### 2.3 Tiled Terrain System (Completed)
* **Binary `.wgt` Format**: High-speed, flat-buffer-like format for raw elevation grids, supporting `SharedArrayBuffer` for zero-copy sharing across worker threads.
* **Global Theater Mode**: Boundaries are no longer hardcoded. The simulation is globally queryable; playable areas are dictated by **Data Coverage**, not memory constraints.
* **1x1 Degree Slicing**: Large regional GeoTIFFs (e.g., GEBCO) are automatically sliced into 1°x1° bins for optimized disk I/O and paging.
* **Bilinear Interpolation**: Implemented a 4-sample bilinear lookup for all terrain queries to provide a continuous C1-continuous surface, preventing "pixel-snapping" spikes in the RK4 Force Accumulator.

### 2.4 The Deterministic Runtime (Completed)
* The core `Engine` is fully decoupled from network layers and file I/O.
* **`SimulationRuntime`**: A composable host environment that manages the engine lifecycle via `createStandard()`.
* **`FixedStepTicker`**: A deterministic clock ensuring the simulation executes at a fixed logical rate (e.g., 10Hz, `dt=0.1s`).
* **FileSystem Providers**: Integrated `FileSystemScenarioProvider` and `FileSystemTileLoader` for data-driven persistence.

---

## 3. The Future Architecture (What We Are Building Next)

To support real-world environments and true 6 Degrees of Freedom (6-DOF) flight dynamics, the engine must adopt a **Provider-Based Architecture** and a **Continuous Field Environment**.

### 3.1 Phase 1: The Force Accumulation Pipeline
The current `KinematicsSystem` is monolithic—it calculates drag, thrust, fuel burn, and position in one loop. We will transition to a **Sum of Forces** pipeline.

* **Buffer Expansion**: Add `forcesX`, `forcesY`, `forcesZ` (Float32Array) to the `WorldBuffer`.
* **`IForceProvider` Interface**:
  ```typescript
  export interface IForceProvider {
      applyForce(id: EntityId, dt: number, reg: ECSRegistry): void;
  }
  ```
* **Decoupled Systems**:
    * `GravitySystem`: Applies $F = mg$ (accounting for Earth curvature).
    * `PropulsionSystem`: Applies $F = Thrust$ based on throttle and local atmospheric limits.
    * `AerodynamicsSystem`: Applies Lift and Drag forces based on relative wind velocity, Mach number, and dynamic $C_d$ lookups.
* **The Solver**: The `KinematicsSystem` (using RK4) runs *last*. It blindly reads $F_{net}$ from the buffers, calculates $a = F/m$, integrates velocity/position, and zeroes the force buffers for the next tick.

### 3.2 Phase 2: WGS84 & ENU Geometry
Flat 50km grids are insufficient for ICBMs or cruise missiles. The engine will adopt an **East-North-Up (ENU)** Local Tangent Plane projection.

* **Scenario Origin**: Every scenario defines a WGS84 Lat/Lon center.
* **ENU Tangent Plane**: `positionsX` (East) and `positionsY` (North) map to this plane.
* **Earth Curvature Drop**: As entities travel far from the origin (e.g., 100km East), the engine calculates the geometric drop of the Earth's ellipsoid to ensure ships and sea-skimming missiles remain on the curved ocean surface (a negative Z offset relative to the tangent plane).

### 3.3 Phase 3: The Environmental Oracles
The environment must be treated as a set of continuous, queryable 4D fields, not static arrays.

* **`IFieldAccessor<T>`**: Base interface requiring `sample(x, y, z)` with bi-linear interpolation to prevent "grid-snapping" anomalies during physics updates.
* **`IAtmosphereOracle`**: 
    * Implementation: **1976 International Standard Atmosphere (ISA)**.
    * Behavior: Calculates precise air pressure, density ($\rho$), temperature, and the local speed of sound ($a$) for any given altitude. Crucial for calculating Mach numbers and high-altitude engine performance.
* **`ITerrainOracle`**:
    * Implementation: Queryable heightmaps for both land (DTED/SRTM) and bathymetry (GEBCO).
* **`EnvironmentSystem`**: Runs first in the tick loop. It samples the Oracles based on entity positions and writes `localAirDensity`, `localSpeedOfSound`, and `windVectors` to the `WorldBuffer` for the Force Providers to consume.

### 3.4 Phase 4: Tiled Data Broker
Real-world terrain and GRIB weather data are too massive to fit in RAM.

* **`.wgt` (War-Games Tile)**: A custom, high-performance binary format containing raw `Float32Array` elevation/field data with localized bounding boxes.
* **Async Paging Manager**: A background worker that tracks the simulation's active operational area and pre-emptively streams `.wgt` files into memory buffers before entities cross into them.
* **Tier 1 Fallback**: If real-world data is missing or streaming lags, the `TerrainOracle` seamlessly falls back to procedural math (e.g., flat ocean) so the physics thread never blocks or crashes.

---

## 4. Initialization & Composition
The engine configuration will be updated to accept these swappable providers, allowing the user to configure the fidelity of the simulation at boot time:

```typescript
const engine = new Engine({
    physics: {
        integrator: new RK4Integrator(),
        forces: [
            new GravitationalForce(),
            new AerodynamicDrag(),
            new JetPropulsion()
        ]
    },
    environment: {
        atmosphere: new ISAAtmosphere(),
        terrain: new TiledTerrainManager('./data/tiles/')
    }
});
```

---

## 5. Universal Runtime & Distributed Task Architecture

To support massive scalability and Monte Carlo experimentation, the engine has been refactored into an environment-agnostic "Compute Kernel" capable of running thousands of simultaneous independent timelines.

### 5.1 The Universal Engine Core (The "Black Box")
The core `Engine` instance is strictly isolated from its host environment:
*   **Deterministic Lifecycle**: All time, randomness, and execution order are derived from a provided `Seed` and the `FixedStepTicker`.
*   **No Global Side-Effects**: All state lives within the instance's `WorldBuffer` and `ECSRegistry`.
*   **Isolated Heap**: When running in distributed mode, the engine disables `SharedArrayBuffer` in favor of isolated heap memory to eliminate thread-locking overhead and allow true linear scaling across CPU cores.

### 5.2 Worker Thread Pool (Monte Carlo Scaling)
The application utilizes a **Coordinator-Worker** model to handle massive horizontal scaling:
*   **Coordinator**: Manages a pool of OS-level Worker Threads, distributing stochastic jobs and aggregating results.
*   **Workers**: Independent isolates that execute the simulation at "Fast-Forward" speed (unbound from the real-time clock).
*   **Parametric Mutation (Stochastic Fuzzing)**: Every job can specify a list of path-based mutations (e.g., `kinematics.maxSpeedKts`) to find statistical edge cases or perform sensitivity analysis.

### 5.3 Distributed Safety & Reliability
*   **The Watchdog Timer**: The Coordinator monitors worker health and aggressively terminates threads that exceed a defined physical execution timeout (e.g., 30s for a 1-hour simulation).
*   **Numerical Singularity Protection**: The RK4 integrator automatically detects and halts simulations if `NaN` or `Infinity` is detected in the kinematic buffers, reporting the specific fuzzed parameters that caused the failure.
*   **Aggregated Egress**: Workers perform local aggregation of telemetry (e.g., "Total Distance", "Hit Probability") and only return the summarized data and terminal snapshot to minimize message-passing overhead.

---

## 6. Operational Guide: Environmental Data Ingestion

### 6.1 Preparing Terrain Data
To ingest real-world terrain (e.g., from [GEBCO](https://www.gebco.net/) or [Copernicus](https://spacedata.copernicus.eu/)), download the GeoTIFF for your target area and use the pre-processing utility:

```bash
# Install dependencies if not present
npm install geotiff

# Convert large regional GeoTIFF (e.g. GEBCO) to 1x1 degree .wgt tiles
npx tsx src/scripts/process_terrain.ts <path_to_geotiff> ./data/terrain/
```

This will generate files named by their geographic origin, e.g., `34_-118.wgt` (34N, 118W).

### 6.2 Configuring the Simulation Server
In your server-side entry point (e.g., `src/server/index.ts`), initialize the `Engine` with the `FileSystemTileLoader`:

```typescript
import { SimulationRuntime } from './engine/runtime/SimulationRuntime.js';
import { FileSystemTileLoader } from './server/environment/FileSystemTileLoader.js';

const runtime = SimulationRuntime.createStandard({
    tileLoader: new FileSystemTileLoader('./data/terrain/'),
    ticksPerSecond: 10
});
```

### 6.3 Triggering Terrain Loading in Scenarios
The `TileManager` is reactive. To activate the `TerrainOracle` for a specific scenario, ensure the manifest defines a WGS84 `mapCenter`:

```json
{
    "name": "Pacific Theater Engagement",
    "environment": {
        "mapCenter": [34.05, -118.24]
    },
    "units": [...]
}
```

---

## 7. V2 Profile Architecture (Generational Archetypes)

To ensure the simulation remains robust and decoupled from specific file dependencies, the V2 architecture implements a dual-mode initialization strategy.

### 7.1 JSON Independence & Schema Defaults
The core engine and test suite are designed to be fully functional without requiring any JSON files loaded from the disk. When `EntityManager.spawn()` is called without a valid `profileId`, the system automatically resolves every entity property using the programmatic defaults defined in the `SCHEMA` (`src/engine/meta/registry.ts`). This ensures that the engine can always boot and execute a baseline simulation in headless or network-only environments.

### 7.2 Shared Validation Pipeline (Zod)
Consistency is maintained by routing both programmatic (memory-based) and JSON (file-based) data through the exact same validation pipeline. 
*   **Programmatic Spawns**: Manual overrides passed via `SpawnParams` are validated against the `SCHEMA` dynamically at runtime.
*   **JSON Profiles**: Hydrated JSON objects are passed through the `ProfileRegistry` validator before being mapped to the `WorldBuffer`.
This unified path prevents "hidden state" bugs where a code-based entity behaves differently than a JSON-based entity due to missing validation or default-value drift.

### 7.3 Generational "Kitchen Sink" Templates
Specific legacy profiles (e.g., `mk45_gun_5_inch`) are replaced by generic, generational archetypes:
*   **Archetypes**: `ship`, `small-ship`, `gen3-fighter`, `heavy-cannon`, `advanced-radar`.
*   **The "Kitchen Sink" Principle**: These templates are designed to be as comprehensive as possible, defining every valid property allowed by the `SCHEMA`. This serves as a live validation test for the `WorldBuffer` mapping and ensures that any new property added to the metadata groups is immediately exercised by the core generational profiles.
### 7.4 Modular Spawn Pipeline (Component Builders)
To prevent the `EntityManager` from becoming a monolithic "God Class," complex initialization logic is delegated to a sequence of domain-specific handlers.

*   **`ISpawnHandler` Interface**: Each module (Kinematics, Sensors, Combat, etc.) implements a standard `initialize` method.
*   **Pipeline Execution**: During `spawn()`, the engine runs the automatic schema hydration first, followed by the registered pipeline.
*   **Isolation of Concerns**: 
    *   **`KinematicsSpawner`**: Handles coordinate projections and initial velocity vectors.
    *   **`SubsystemSpawner`**: Resolves complex relational lookups for weapon mounts and sensor arrays.
    *   **`WeaponSpawner`**: Dynamically configures multi-stage flight plans and seekers.
---

## 8. Appendix: Migrating Tests to V2 Architecture

The transition to Metadata-First SoA and 64-bit precision requires specific updates to existing unit tests.

### 8.1 Float64 Precision Mismatches
Many buffers (like `positionsX/Y/Z`) have been upgraded from `float32` to `float64` in the `SCHEMA`. 
*   **Fix**: Update test assertions from `toBeInstanceOf(Float32Array)` to `toBeInstanceOf(Float64Array)`.
*   **Fix**: Use `toBeCloseTo()` instead of exact equality for spatial coordinates to account for high-precision projection offsets.

### 8.2 Sensor Detection Stability
The simulation now defaults to realistic beam widths (e.g., 1 degree). At a 10Hz tick rate and 1Hz rotation, a narrow-beam sensor can easily "skip over" a target in a single frame.
*   **Fix**: In unit tests, manually force `reg.buf.beamWidthDeg[id] = 360` or set `reg.buf.sweepRateHz[id] = 0` to ensure stable detection during logic verification.
*   **Fix**: Ensure `currentAzimuth` is initialized to the entity's heading if the sensor is stationary.

### 8.3 Moved Helper Methods
Functions like `hashString`, `inferCategory`, and `parseArc` have been moved from the monolithic `EntityManager` into specific `ISpawnHandler` implementations (e.g., `CoreSpawner`, `SubsystemSpawner`).
*   **Fix**: Update tests to instantiate the specific Spawner to test these utility functions, or move common utilities to a shared `src/engine/utils/` file.

### 8.4 Logistic & Maintenance Factors
Munition reliability is now driven by `logistics.maintenanceFactor`. The default `SCHEMA` value may result in "duds" (0 damage) during combat tests.
*   **Fix**: Set `maintenanceFactor: 1.0` in test profiles or manually in the buffer (`b.maintenanceFactor[id] = 1.0`) to ensure 100% weapon reliability during unit testing.

### 8.5 SharedArrayBuffer Alignment
The dynamic allocator now strictly enforces 8-byte alignment for `Float64` arrays.
*   **Fix**: Tests that manually calculate `byteLength` must use `calculateBufferLayout(capacity)` from `bufferLayout.ts` rather than simple multiplication to account for internal padding and bitmask overhead.



# Architectural Specification: The V2 "Test Range" Framework

## 1. Executive Summary & Core Philosophy
With the core engine transitioning to a declarative, DAG-driven Reconciler architecture, the testing methodology must pivot entirely. You are no longer testing whether a function executes; you are verifying that a **mathematical intent** correctly translates into **physical state** over time, with absolute determinism.

The legacy test suite (which likely spun up the entire monolithic engine to test a simple weapon launch) is replaced by the **Test Range Framework**. This framework enforces testing at three isolated layers: Pure State Mutations (The Ministries), DAG Orchestration (The Politburo), and Headless Temporal Integration (The Test Range).

---

## 2. Layer 1: Ministry Unit Testing (Pure State Mutation)
Because the Domain Reconcilers (e.g., `NavigationReconciler`, `EngagementReconciler`) are now strictly isolated from the execution loop and physical movement, they can be tested as pure state-mutation functions.

### 2.1 The "Mockless" WorldBuffer
You do not mock the `Engine` or the `OrderQueue`. You instantiate a raw, headless `WorldBuffer` and `ECSRegistry` initialized with programmatic schema defaults.
* **Setup:** Seed the buffer with an Entity at `[Lat A, Lon B]`.
* **Action:** Pass a `MapsTask` and the `ECSRegistry` directly to the `NavigationReconciler.reconcile()`.
* **Assertion:** Verify that `reg.buf.commandedLat[id]` and `reg.buf.commandedHeading[id]` were mutated to the correct mathematically derived values.
* **State Assertion:** Verify the task's FSM state transitioned from `PENDING` to `IN_PROGRESS` (or `COMPLETED` if the distance delta is within the arrival threshold).

### 2.2 Zod Payload Enforcement
Unit tests must aggressively validate the `SCHEMA`. Pass invalid payloads (e.g., `targetLat: 95`) directly to the Zod payload schemas to ensure the boundaries of the generic tasks reject impossible physics before they ever reach the Reconciler.

---

## 3. Layer 2: The Bureaucracy Tests (DAG Orchestration)
This layer tests the `TaskReconcilerSystem` (The Politburo) to ensure it correctly parses dependencies and prevents race conditions, without caring about what the actual tasks do.

### 3.1 The Dependency Matrix
* **Setup:** Inject a `TaskGraph` containing Node A (Navigate), Node B (Launch, depends on A), and Node C (Egress, depends on B).
* **Tick 1:** Assert Node A is passed to its Reconciler. Assert Nodes B and C are ignored.
* **Mutation:** Manually force Node A to `COMPLETED`.
* **Tick 2:** Assert the Orchestrator successfully resolves Node A's completion and promotes Node B to `IN_PROGRESS`.

### 3.2 The Executive Veto (Interruption)
* **Setup:** An entity is processing a standard `StrikeMission` DAG.
* **Action:** Inject an `EvasionTask` into the Priority Override slot.
* **Assertion:** On the next tick, verify the Orchestrator sets the main DAG active node to `SUSPENDED` and strictly routes execution to the `EvasionReconciler`.

---

## 4. Layer 3: The "Test Range" Simulation Harness (Temporal Integration)
This replaces the old `Systems_Ext.test.ts` monolithic tests. To verify Phase 1 Force Accumulation and Phase 3 Oracles, you must simulate physical time.

### 4.1 The `SimulationTestHarness`
This is a headless execution environment (`src/engine/test-range/SimulationTestHarness.ts`).
* **No File I/O:** It uses the Programmatic Profile defaults, bypassing the `FileSystemScenarioProvider`.
* **Manual Stepper:** It utilizes the `ManualStepper` time controller (Layer 3 spec) to advance the `Engine` exactly 1 tick at a time (`dt = 0.1s`).

### 4.2 The "Fire-and-Forget" Assertion
Instead of testing instantaneous variables, test the *result* of the continuous physics pipeline:
1.  Spawn a generic `gen3-fighter`.
2.  Assign a `MapsTask` to a coordinate 50km away.
3.  Command the harness: `harness.fastForward(500)` (Simulate 50 seconds).
4.  Assert that the RK4 Integrator, reading the Reconciler's commanded vectors and the Atmosphere Oracle's air density, physically moved the `Float64Array` positional coordinates to the target destination.

### 4.3 High-Precision Spatial Assertions
Because the ECS now uses WGS84 and ENU `Float64Array` coordinates:
* Standard equality (`===`) will fail due to floating-point drift in the RK4 integration.
* The framework must implement a custom spatial assertion: `expect(entity).toBeWithinOperationalRadius(targetLat, targetLon, 50 /* meters */)`.

---

## 5. Layer 4: The Isolation Runner (Distributed Fuzzing & Monte Carlo)
To guarantee the scientific determinism of the engine, the framework must systematically hunt for numerical singularities ($NaN$, $Infinity$) caused by extreme edge cases.

### 5.1 Fuzzing the Constants
Using `IsolationRunner.ts`, the test framework spins up isolated worker threads.
* It feeds extreme, mutated parameters into the schema (e.g., Missile Mass = 0.001kg, Thrust = 5,000,000 N).
* It runs the simulation using the `AFAPTicker` (As Fast As Possible).

### 5.2 The Singularity Trap
* The runner monitors the `WorldBuffer` across thousands of high-speed ticks.
* **Assertion:** The engine must safely catch the mathematical failure in the `KinematicsSystem`, halt the timeline, and return a `SIMULATION_FAULT` payload reporting the specific parameter that caused the crash, rather than crashing the V8 worker thread or silently corrupting the `SharedArrayBuffer`.

### 5.3 Determinism Verification
* Run the exact same scenario with the exact same `Seed` across three different `IsolationRunners`.
* Take a snapshot of the `WorldBuffer` at Tick 10,000 for all three.
* **Assertion:** Compute a cryptographic hash of the `Float64Array` kinematic data. All three hashes must be identical, proving that zero race conditions or async tile-loading delays breached the pure logic of the Compute Kernel.


# Architectural Specification: The Layer 3 Command Line Interface (CLI)

## 1. Core Philosophy: The CLI as a "Dumb Client"
In the V2 architecture, the CLI framework (`src/utils/CLIFramework.ts`) must never contain simulation logic, nor can it mutate the `WorldBuffer` directly. 

The CLI is strictly a **Layer 3 Environment Client**. Its only responsibilities are:
1. Bootstrapping the `SimulationHost` with specific timing and I/O plugins.
2. Parsing string arguments into raw JSON payloads.
3. Passing those payloads to the Zod-backed `ICommandGateway` for validation and entry into the DAG.

To maintain your "Fort Knox" zero-tolerance type safety, the CLI args parser (e.g., `yargs` or `commander`) must pipe directly into the `SCHEMA` validators before the engine ever sees the command. If a user types a string where a number is expected, the CLI rejects it instantly; it never reaches the Orchestrator.

---

## 2. Global Execution Commands (Bootstrapping the Host)
These commands define *how* the compute kernel runs. They swap out the `ITimeController` plugin at boot.

### `wg run <scenario.json>`
* **Mode:** Real-Time / Server.
* **Mechanism:** Injects the `FixedStepTicker` (e.g., 10Hz) and the `TerminalGateway` (for taking live orders while running). 
* **Output:** Streams the `TurnSnapshot` to the `ATDR_Broadcaster` to render the terminal UI map.

### `wg batch <scenario.json>`
* **Mode:** Monte Carlo / Stochastic Fuzzing.
* **Mechanism:** Injects the `AFAPTicker` (As Fast As Possible) and disables the `ATDR_Broadcaster` to eliminate render overhead. It spawns the `SimulationCoordinator` to manage an isolated worker pool.
* **Flags:**
    * `--runs=1000`: Number of independent timelines to simulate.
    * `--workers=auto`: Spawns threads based on CPU cores.
    * `--accelerate=gpu`: Offloads tensor/matrix math to local hardware (e.g., routing parallel kinematics to an external RTX 3080).
    * `--fuzz=<path>`: Points to a JSON mapping of schema properties to mutate (e.g., `{"weapons.aim120.maxSpeed": [3.0, 5.0]}`).

### `wg step <scenario.json>`
* **Mode:** Interactive Debugging (The "Laboratory").
* **Mechanism:** Injects the `ManualStepper`. The simulation starts completely paused. It only ticks when explicitly commanded.
* **Flags:**
    * `--tick-rate=0.1`: Sets the logical $dt$ of a single step.

---

## 3. The Interactive Console (Tactical Intents)
When running in `step` mode (or a paused `run` mode), the CLI opens an interactive prompt (`wg>`). The commands typed here are mapped directly to the `TacticalTask` discriminated union to populate the DAG.

### Syntax: `order <entityId> <TaskType> [payload]`
The payload flags match the Zod schema for that specific task.

* **Navigation Tasks:**
  ```bash
  wg> order 101 NAVIGATE --lat 34.05 --lon -118.24 --speed 25
  ```
  *Action:* The CLI forms a JSON payload, the `TerminalGateway` validates it against `MapsPayloadSchema`, and the Graph Compiler injects a Node into Entity 101's DAG.

* **Combat Tasks:**
  ```bash
  wg> order 101 ENGAGE --target 204 --alloc "aim_120:2"
  ```
  *Action:* Validates against `EngagePayloadSchema` and queues the multi-phase engagement reconciler.

* **Subsystem Toggles (Instant Mutations):**
  ```bash
  wg> set 101 RADAR --state ACTIVE
  ```
  *Action:* Bypasses the DAG. Maps to the generic ECS mutator to instantly flip the bitmask in `SensorsMeta`.

---

## 4. The Diagnostic Commands (The Inspector)
Because the `WorldBuffer` consists of raw `SharedArrayBuffer` memory mapped to `Float64Arrays`, debugging via standard `console.log()` will just yield unreadable binary views. The CLI must provide specialized readers.

### `wg inspect entity <id>`
* **Mechanism:** Reads the `ECSRegistry` proxy for the given ID.
* **Output:** Formats the flat buffer memory back into a readable JSON tree representing the entity's current kinematic, sensor, and combat state.

### `wg inspect dag <id>`
* **Mechanism:** Queries the `TaskGraphManager`.
* **Output:** Prints a visual tree of the entity's current FSM pipeline.
  ```text
  Entity 101 Task Graph:
  [COMPLETED] TRANSIT_TO_STATION (Task ID: a1b2)
  ├── [IN_PROGRESS] ESTABLISH_CAP (Task ID: c3d4)
  │   └── [PENDING] ENGAGE_VAMPIRE (Task ID: e5f6) [Blocked by: c3d4]
  ```

### `wg inspect oracle --lat <Y> --lon <X> --alt <Z>`
* **Mechanism:** Directly queries the `AtmosphereOracle` and `TerrainOracle` at specific 3D coordinates.
* **Output:** Prints the continuous field data exactly as the RK4 integrator would see it.
  ```text
  Environment at [34.05, -118.24, 10000m]:
  Terrain Elev: 0m (Sea Level)
  Air Density: 0.4135 kg/m^3
  Speed of Sound: 299.5 m/s
  ```

---

## 5. System Administration (Data Prep)
Real-world continuous field data must be ingested before simulations can run. The CLI provides tools to convert raw geospatial datasets into the engine's zero-copy `.wgt` binary format.

### `wg ingest terrain`
* **Syntax:** `wg ingest terrain --source <file.tif> --out ./data/terrain`
* **Mechanism:** Triggers `src/scripts/process_terrain.ts`. Slices massive GeoTIFFs (like GEBCO bathymetry or DTED elevation) into the 1°x1° optimized flat-buffer slices required by the async Paging Manager.

### `wg debug-terrain`
* **Syntax:** `wg debug-terrain --lat <Y> --lon <X>`
* **Mechanism:** Runs `src/scripts/debug_scan_terrain.ts` to verify the C1-continuous bilinear interpolation is working correctly across tile boundaries, ensuring no "pixel-snapping" spikes exist in the dataset before loading it into a live scenario.


# Architectural Specification: The Advanced Tactical Diagnostic Renderer (ATDR)

## 1. Executive Summary & Core Philosophy
In the V2 architecture, the renderer is entirely stripped of its agency. It is no longer a "Game Loop" that calculates physics or queries the `WorldBuffer` directly. The ATDR is a **Strictly Passive, Isomorphic Consumer**. 

It implements the Layer 3 `IStateBroadcaster` egress interface. Its sole responsibility is to receive immutable `TurnSnapshot` packets from the Compute Kernel, interpolate the data to smooth out the logical tick rate, and project WGS84 Euclidean coordinates onto a 2D screen space. Because it contains zero simulation logic, the ATDR can be hot-swapped, completely disabled for Monte Carlo batch runs, or run on a remote WebSocket client without affecting the engine's determinism.

---

## 2. Isomorphic Target Architecture (The Hardware Abstraction)
To support both browser-based debugging and server-side headless video generation, the core `SnapshotRenderer` is decoupled from the actual graphics API.

### 2.1 The `IRenderTarget` Contract
All drawing operations (lines, text, arcs, image blitting) are routed through an abstract interface. The core renderer never calls `ctx.lineTo()` directly.

### 2.2 Concrete Implementations
* **`BrowserRenderTarget`**: Wraps the standard HTML5 `<canvas>` API for real-time visualization in the developer UI.
* **`ServerRenderTarget`**: Wraps a native Node.js canvas implementation (e.g., `@napi-rs/canvas`). This allows the server to generate tactical maps entirely in memory without a DOM or GPU access.
* **`AnimationExporter`**: Hooks into the `ServerRenderTarget` during batch runs. It takes a sequence of rendered frames and encodes them into a `.mp4` or `.gif` replay of the simulation, strictly using the headless server environment.

---

## 3. The Temporal Interpolation Pipeline (The Smoothness Doctrine)
The V2 Compute Kernel runs at a rigid, fixed logical step (e.g., 10Hz, or $dt = 0.1s$) to guarantee mathematical determinism. However, a 10Hz visual update looks like a slideshow. The ATDR solves this via a decoupled render loop.

### 3.1 The Snapshot Buffer
The renderer maintains a sliding window of exactly two states: `prevSnapshot` and `currentSnapshot`. 

### 3.2 The Frame Lerp
The visual render loop runs as fast as the monitor allows (e.g., $60FPS$ via `requestAnimationFrame`). Before drawing, the ATDR calculates a normalized `alpha` ($0.0$ to $1.0$) representing the real-time elapsed between the receipt of `prevSnapshot` and `currentSnapshot`. 

It linearly interpolates (Lerps) the high-precision `Float64Array` WGS84 coordinates, headings, and sensor sweep azimuths. This guarantees that a missile flying at Mach 3 appears mathematically perfectly smooth on screen, even though the physics engine only calculated its position 10 times a second.

---

## 4. The Z-Ordered Render Stack (The 10 Layers)
To prevent visual clutter, z-fighting, and performance bottlenecks, the rendering logic is split into 10 strictly isolated strategies, executed in absolute numerical order. Each layer receives the interpolated frame data and the `GeoProjection` instance.

* **`Layer0_Environment`**: Renders the continuous fields. It maps the `TerrainOracle` heightmaps to bathymetric (blue gradients) and topographical (green/brown) color bands.
* **`Layer1_Grid`**: Draws the foundational geometry. Renders dynamic WGS84 Lat/Lon graticules, map scale bars, and coordinate axes.
* **`Layer2_Physics`**: The "Ground Truth" debug layer. Draws true center-of-mass micro-dots, with absolute velocity vectors (blue lines) and acceleration vectors (red lines) pulled directly from the RK4 Integrator data.
* **`Layer3_Tactical`**: The core symbology layer. Translates `ProfileRegistry` archetypes into NTDS / MIL-STD-2525 icons (Friendly=Blue/Circle, Hostile=Red/Diamond, Unknown=Yellow/Square). 
* **`Layer4_Sensors`**: Visualizes the `TMSSystem` and `AtmosphereOracle`. Draws translucent sweep arcs for active radars and bounding circles for passive sonar, interpolating the `currentAzimuth` to show sweeping motions.
* **`Layer5_EW`**: The Electronic Warfare overlay. Renders jamming strobes, noise-floor heatmaps, and signal-to-noise ratio (SNR) degradation zones.
* **`Layer6_Combat`**: The kinetic layer. Draws WEZ (Weapon Engagement Zones) as dashed circles, connects active engagements with dashed targeting lines, and renders explosion transients.
* **`Layer7_AI`**: The intention layer. Reads the `TaskGraphManager` output to draw assigned waypoints, patrol polygons, CAP (Combat Air Patrol) stations, and formation grid guides.
* **`Layer8_Comms`**: The network layer. Draws topological lines between friendly units to visualize data-link health, line-of-sight communication breaks, and mesh network routing.
* **`Layer9_Terminal`**: The HUD. Renders absolute screen-space elements (bypassing the Camera projection): hovering telemetry blocks, tooltip data, simulation clocks, and frame-rate counters.

---

## 5. The Camera & Geospatial Projection
Because the ATDR must render a curved Earth onto a flat screen, it utilizes a rigorous projection system to translate physical data into pixels.

### 5.1 `GeoProjection` Math
The projection system accepts the WGS84 map center and converts the ENU (East-North-Up) distances back into Lat/Lon, and then maps them to 2D pixel coordinates. It actively accounts for the WGS84 ellipsoid drop, ensuring that units beyond the radar horizon render correctly relative to their altitude.

### 5.2 The `Camera` Controller
The Camera acts as a viewport matrix. It manages:
* **Translation**: Panning the viewpoint across the WGS84 grid.
* **Scale**: Zooming seamlessly from a 5km tactical local engagement out to a 5,000km theater-level view.
* **Culling**: The Camera calculates a Frustum (bounding box). Before passing data to the 10 Layers, it violently culls any entities, waypoints, or sensors that fall outside the viewport, ensuring that rendering a 10,000-unit global scenario doesn't crash the canvas API by drawing off-screen pixels.
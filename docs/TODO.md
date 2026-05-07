# SDK Refactoring TODO

This checklist tracks the tasks required to bring the SDK into compliance with the engineering standards defined in `GEMINI.md` and to improve its architectural integrity.

## 1. Type Safety & Standards Compliance

- [ ] **Eliminate `any` usage**
  - [ ] Remove `z.any()` from `EngineEventSchema` in `src/sdk/schemas/protocol.ts`.
  - [ ] Replace `(schema._def as any).description` in `src/sdk/tools/TacticalTools.ts`.
- [ ] **Remove Unsafe Type Assertions**
  - [ ] Eliminate `as unknown as` casts in `src/sdk/mcp/index.ts`.
  - [ ] Eliminate `as unknown as` casts in `src/sdk/WarGamesClient.ts`.
  - [ ] Replace `as EngineCommandPayload` with `EngineCommandPayloadSchema.parse()` in `src/sdk/tools/TacticalTools.ts`.
  - [ ] Refactor `MatchService.ts` to use type guards or schemas instead of `as EntityProfile` and `as SimulationEvent`.
  - [ ] Refactor `TerrainService.ts` to use type guards instead of `as ArrayBuffer`.
- [ ] **Error Handling**
  - [ ] Replace manual error casting (`as Error`) in catch blocks with `instanceof Error` or a safe helper.

## 2. Architectural Refactoring

- [ ] **Decompose WarGamesClient**
  - [ ] Move `BugModule` to `src/sdk/BugModule.ts`.
  - [ ] Move `ScenarioModule` to `src/sdk/ScenarioModule.ts`.
  - [ ] Move `TerrainModule` to `src/sdk/TerrainModule.ts`.
- [ ] **Decouple SDK from Engine**
  - [ ] Move `MatchService.ts` out of the SDK (e.g., to `src/server/` or a shared core).
  - [ ] Move `ScenarioService.ts` out of the SDK.
  - [ ] Move `TerrainService.ts` out of the SDK.
- [ ] **Robust Tool Generation**
  - [ ] Refactor `generateCommandTools` in `TacticalTools.ts` to avoid relying on internal Zod metadata (`_def`).

## 3. Command Pattern Consistency

- [ ] **Unified Dispatch**
  - [ ] Evaluate moving session control (pause, resume, time compression) into the `EngineCommandPayload` to maintain a single path for all state mutations.

## 4. Engine & Component Smells

- [ ] **Pure Data Violation (Logic in Components)**
  - [ ] Move `periodSec` calculation from `OrbitalComponent` to `OrbitalSystem` or a math utility.
  - [ ] Move `getEffectiveRCS` logic from `RCSComponent` to `SensorSystem` or `SignatureSystem`.
  - [ ] Move history management (`record` method) from `TelemetryComponent` to `TelemetrySystem`.
- [ ] **Duplicate Component Definitions**
  - [ ] Resolve identical `TrackComponent` definitions in `src/engine/components/TMS.ts` and `src/engine/components/Track.ts`.
- [ ] **Schema Location**
  - [ ] Move `WRARuleSchema` and related types from `src/engine/components/Doctrine.ts` to a centralized schema directory.
- [ ] **Heavy Component Dependencies**
  - [ ] Refactor `TaskGraphComponent` to avoid direct instantiation/dependency on `TaskGraph` implementation if possible, or ensure it remains a data container.
- [ ] **Consistency**
  - [ ] Standardize component constructors (e.g., use of `Partial` and `Object.assign` vs. explicit parameters).

## 5. Engine Core & Handler Smells

- [ ] **Command Handler Complexity**
  - [ ] Refactor `FireWeaponHandler` in `src/engine/core/handlers/CombatCommandHandlers.ts`. Move ballistics calculations and munition spawning to a dedicated `WeaponSystem` or `MunitionFactory`.
  - [ ] Reduce coupling between handlers and `EntityManager`.
- [ ] **Data-Driven Spawning**
  - [ ] Refactor `EntityManager.ts` to reduce hardcoded defaults (e.g., `isWeapon ? 50.0 : 9.0`) and move this logic into platform profiles or specialized factory components.
- [ ] **Enum Casting & Parity**
  - [ ] Reduce manual casting (e.g., `as ROE`, `as TurnaroundState`) in `ScenarioLoader.ts` and `EntityManager.ts`. Ensure engine enums and SDK schemas are perfectly synchronized via shared types.
- [ ] **Serialization / Hydration**
  - [ ] Review `ComponentRegistry.create` (uses `Object.create`) to ensure constructors with logic or side effects aren't being bypasssed unsafely.
- [ ] **Randomness in Simulation**
  - [ ] Replace `Math.random()` and `Date.now()` with a deterministic seedable random number generator and the `SimulationClock` tick/timestamp for all simulation-affecting logic (e.g., entity IDs, dispersion).

## 6. Environment & Map Smells

- [ ] **Blocking I/O**
  - [ ] Refactor `MapDataService.loadAll()` to be asynchronous. Synchronous `readFileSync` in the engine startup/loop blocks the event loop.
- [ ] **Memory Leaks**
  - [ ] Implement a proper LRU limit for `TileManager` cache. Currently, it is a `Map` that grows indefinitely, which will cause OOM in long sessions.
- [ ] **Performance (Async Bottlenecks)**
  - [ ] Evaluate if `TerrainOracle.getElevation` can be made synchronous for already-cached tiles. `await` in the middle of hot loops (like A* or LOS checks) introduces significant microtask overhead.
  - [ ] Optimize `AStarPathfinder`: The current implementation is very slow due to `await` inside the neighbor loop and hardcoded resolution/iteration limits.
- [ ] **Brittle Buffer Handling**
  - [ ] Fix `WgtFormat.decode` to correctly handle `ArrayBuffer` offsets and views if the input is a slice of a larger buffer.
- [ ] **Hardcoded Paths**
  - [ ] Replace `process.cwd()` and hardcoded `data/terrain` paths with configurable paths from the `ServiceConfig`.

## 7. Ministry & Worker Smells

- [ ] **Inconsistent Interfaces**
  - [ ] Refactor `MinistryOfStrike.ts` to implement `IMinistry<MissionType.Strike>`. It is currently a standalone class.
- [ ] **Logic Leaks (Worker vs System)**
  - [ ] Move complex steering and lead-pursuit logic from `InterceptWorker` and `NavigationWorker` to a dedicated `GuidanceMath` or `AutopilotSystem`.
  - [ ] Evaluate if `MinelayWorker` state (lastDropPos, droppedCount) should be moved to a `MinelayComponent` to support serialization/hydration.
- [ ] **Magic Numbers & Hardcoded AI**
  - [ ] Remove hardcoded constants like `orbitRadius = radiusM * 0.7` and `angle = world.currentTick * 0.01` in `MinistryOfPatrol`. These should be configurable mission parameters.
  - [ ] Standardize "Hover/Approach" offsets (e.g., `z + 10`, `z + 50`) in `InterceptWorker`.
- [ ] **Objective ID Fragility**
  - [ ] Replace string-concatenated `objectiveId`s (e.g., `patrol-intercept-${targetId}`) with a structured ID generator or typed identifier to prevent collisions and simplify tracking.
- [ ] **DesiredState Extensibility**
  - [ ] Refactor `DesiredState` in `IMinistry.ts` to use a more structured approach for `doctrineUpdates` instead of a loose `Record<string, any>`.
- [ ] **Error Handling in AI**
  - [ ] Replace `throw new Error` in `MinistryOfMCM.ts` with a more graceful mission failure state or `DesiredState` error flag.

## 8. Engine System Smells

- [ ] **State Mutation Violation**
  - [ ] Refactor `PhysicsSystem`, `CombatSystem`, `TMSSystem`, and others to avoid direct mutation of component state (e.g., `kinematics.netForce = {x:0,y:0,z:0}`). All state changes should ideally be routed through Commands to ensure consistency with the CQRS pattern.
- [ ] **System Duplication**
  - [ ] Consolidate `TMSSystem.ts` and `TrackManagementSystem.ts`. They appear to implement similar Level 1 sensor fusion logic with different levels of complexity.
- [ ] **Performance (UI Hydration)**
  - [ ] Refactor `ViewStateSystem`: Currently generates full snapshots for *all* sides every 2 ticks (5Hz). This is a massive O(N_entities * N_sides) bottleneck. Implement delta-tracking or side-on-demand updates.
  - [ ] Remove `Date.now()` usage in `ViewStateSystem.generateSnapshot`. Use `world.timestamp` or `world.currentTick`.
- [ ] **Direct SDK Dependencies**
  - [ ] Move `EntityProfile` and other schema imports in `ViewStateSystem` and `EntityManager` to the `src/engine/core/Types.ts` or a shared internal types file to keep the engine isolated from the SDK.
- [ ] **Hardcoded Physics**
  - [ ] Refactor `PhysicsSystem` to use data from `AeroComponent` or `ShipComponent` rather than hardcoded logic like `100 * speed * speed * kinematics.dragCoeff` for ships.
- [ ] **Event Bus Flooding**
  - [ ] Evaluate the impact of `ViewStateUpdated` events being emitted for every side on every snapshot tick. This could overwhelm the event bus and UI subscribers.

## 9. Final SDK Smells

- [ ] **Fragile Type Introspection**
  - [ ] Refactor `OllamaAdapter.ts` to avoid direct access to Zod `shape`. Use a safer way to introspect schemas for tool definition generation.
  - [ ] Fix `TacticalTools.ts` to remove the double cast `(schema as unknown as z.ZodObject<z.ZodRawShape>)`.
- [ ] **Binary Protocol Fragility**
  - [ ] Refactor `DeltaEncoder` and `DeltaDecoder` to handle potential buffer alignment issues and improve the efficiency of the "unitExtras" JSON segment (which currently partially negates the benefits of binary encoding).
  - [ ] Implement a cache eviction strategy for `DeltaEncoder.lastStates` to prevent indefinite memory growth if sessions aren't explicitly cleared.
- [ ] **Architectural Leaks (SDK Tools)**
  - [ ] Remove direct `fs` dependencies from `DebugTools.ts`. The SDK should not be responsible for file-system operations; these should be routed through a `StorageProvider` or handled by the host application.
- [ ] **Test Fragility**
  - [ ] Clean up `OllamaAdapter.test.ts` to remove `as unknown as` casts in mocks. Use proper interface-compliant mock objects.
- [ ] **Delta Encoding Consistency**
  - [ ] Ensure `DeltaEncoder` and `DeltaDecoder` mapping functions (e.g., `mapSide`, `mapIdentification`) are perfectly synchronized and ideally use a shared constant map or enum.

## 10. Server Core Smells

- [ ] **Abstraction Violation (Storage)**
  - [ ] Refactor `BugManager.ts` to use `IStorageProvider` instead of direct `fs` calls. This ensures consistency with the `NodeProviders` architecture and allows for easier testing/mocking.
  - [ ] Remove synchronous `fs.existsSync` and `fs.writeFileSync` from `BugManager.init()`.
- [ ] **Brittle Path Resolution**
  - [ ] Remove `process.cwd()` usage in `BugManager.ts`. Paths should be provided via configuration or resolved relative to a known base directory.
- [ ] **Data Validation**
  - [ ] Use Zod schemas to validate data loaded from `bug_reports.jsonl` in `BugManager`. Currently, it uses manual normalization which is prone to errors as the schema evolves.
  - [ ] Ensure `SessionManager` uses strict typing/validation for incoming messages if it doesn't already.
- [ ] **Timer Management**
  - [ ] Review `TickManager` for potential race conditions when `restartLoop` is called frequently. Ensure previous timers are always cleared before new ones are started.
- [ ] **Global State**
  - [ ] Evaluate the use of the global `logger` in `NodeProviders.ts` and `SessionManager.ts`. Prefer dependency injection of the logger instance to improve testability.

## 11. Server Plugin & Worker Smells

- [ ] **Logic Duplication (World Creation)**
  - [ ] Refactor `IMPORT_SCENARIO` in `websocket.ts` to use `MatchService.createMatch` instead of manually instantiating `World`, `EntityManager`, and `ScenarioLoader`.
- [ ] **Side Isolation DRY**
  - [ ] Move the "Side Isolation Check" from `websocket.ts` into a middleware or the `CommandDispatcher` to ensure it's applied consistently across all command entry points (WS and REST).
- [ ] **Monolithic Message Handler**
  - [ ] Break down the `handleMessage` function in `websocket.ts` into smaller, command-specific handlers or a strategy pattern.
- [ ] **Magic Numbers (Terrain)**
  - [ ] Move resolution constants (3601, 1201, 256) from `terrain.worker.ts` to a shared configuration or constants file.
- [ ] **Unsafe Assertions**
  - [ ] Remove `!` assertions (e.g., `parentPort!`) and unsafe casts (`ws as ManagedWebSocket`) in server plugins and workers.
- [ ] **Error Handling in Workers**
  - [ ] Ensure that terrain worker failures (e.g., AWS fetch errors) are handled with proper retry logic or mapped to a specific "Terrain Unavailable" state rather than just returning a zeroed-out tile.

## 12. Data Extractor Smells

- [ ] **Code Duplication (LLM Integration)**
  - [ ] Consolidate the `getToolDefinition` and `getJsonType` logic between `src/sdk/llm/OllamaAdapter.ts` and `src/data-extractor/core/Agent.ts`. They are nearly identical and should be moved to a shared utility.
- [ ] **Tight Coupling (CLI)**
  - [ ] Remove `process.stdout.write` and `console.log` from the `ToolAgent` class. It should emit events or use a logger instance to allow for non-CLI usage.
- [ ] **Loose Type Handling**
  - [ ] Improve `getJsonType` to handle more Zod types (e.g., `ZodArray`, `ZodRecord`) to prevent fallback to `string`.

## 13. CLI & Tooling Smells

- [ ] **Client Lifetime Management**
  - [ ] Refactor CLI commands (`BugsCommand`, `SimControlCommand`, etc.) to reuse a single `WarGamesClient` instance or connection pool instead of re-instantiating and re-connecting for every action.
- [ ] **Monolithic Duel Logic**
  - [ ] Decouple the `createPlayer` and `reportBugTool` logic from `DuelCommand.ts`. The "Debug Agent" should be a first-class SDK service or a standalone utility.
- [ ] **Direct I/O in Commands**
  - [ ] Replace `fs.createWriteStream` in `DuelCommand.ts` and `StudyCommand.ts` with a standardized `Logger` or `DataRecorder` abstraction.
- [ ] **Hardcoded Limits**
  - [ ] Move hardcoded constants like `MaxTicks = 10000` (`StudyCommand`) and magic timeouts to a configuration file.

## 14. Core Architecture Refinements (Cross-Layer)

- [ ] **Deep Copy Optimization**
  - [ ] Replace `JSON.parse(JSON.stringify(cmd))` in `Tracer.ts` with a more efficient deep-clone utility or structured cloning if available in the environment.
- [ ] **Autopilot Purity**
  - [ ] Fix `ControlSystem.ts` and `WaypointSystem.ts` where they directly mutate `transform.pitch`. These should emit `SetPitchCommand` to maintain CQRS integrity.
- [ ] **Perception Scaling**
  - [ ] Optimize `SensorSystem.ts`: It currently performs exhaustive nearby entity checks and complex math for every sensor. Evaluate using the `Octree` more effectively for frustum/range culling.
- [ ] **WRA Efficiency**
  - [ ] Optimize `WRAExecutorSystem.ts` to avoid $O(N_{entities} \times N_{tracks})$ checks every tick. Implement a "dirty flag" or "engagement queue" to trigger logic only when tactical pictures change.
- [ ] **Command Factory Bloat**
  - [ ] Refactor `CommandFactory.ts` from a giant switch statement to a registry-based lookup to improve extensibility.
- [ ] **Protocol Drift Protection**
  - [ ] Implement an automated test to ensure `DeltaEncoder` bitmasks and `DeltaDecoder` bitmasks are always in sync.

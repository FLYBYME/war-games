# Multi-Tenant Simulation Server Specification
This is exactly why architectural blueprints exist. When you build a bare-metal, high-performance tactical simulation in Node.js, the complexity scales exponentially. You are building an engine that rivals commercial military simulators. 

To give you a complete picture of the beast you are constructing, here are exactly 100 discrete technical capabilities your server architecture must support, broken down by domain.

### 1. Memory & State Synchronization (Zero-Copy IPC)
1. Allocate `SharedArrayBuffer` for the `WorldBuffer` strictly on the Main Thread.
2. Pass underlying memory pointers to the `SimWorker` via `workerData`.
3. Bind Worker `ECSRegistry` TypedArrays (Float32Array/Int32Array) directly to shared pointers.
4. Read and write entity Structure-of-Arrays (SoA) data without serialization overhead.
5. Manage dynamic ECS ID pooling and recycling.
6. Explicitly purge string/object maps (e.g., `registry.names`) on entity destruction to prevent metadata leaks.
7. Maintain memory alignment for optimal CPU cache utilization during the compute loop.
8. Increment generational counters for ECS IDs to prevent stale reference bugs.
9. Store all numeric component data in contiguous memory blocks.
10. Support reading memory states safely while the worker is actively computing.

### 2. Thread Orchestration & Fault Tolerance
11. Spawn persistent Node.js `worker_threads` for each active interactive match.
12. Monitor worker health via `worker.on('error')` and `worker.on('exit')` listeners.
13. Automatically revive crashed workers by passing the surviving `SharedArrayBuffer` pointers to a new thread.
14. Isolate individual matches to prevent cascading multi-tenant memory corruption.
15. Map active `matchId` strings to their specific running worker threads.
16. Gracefully terminate workers and clear memory when matches conclude.
17. Manage thread affinity and priority to prevent OS throttling.
18. Handle worker initialization timeouts and deadlocks.
19. Pause and resume the `FixedStepTicker` via Main Thread IPC control messages.
20. Limit maximum concurrent worker threads based on the hardware's physical CPU cores.

### 3. Network & Gateway Egress (Telemetry)
21. Maintain a decoupled network broadcast loop running at exactly 10Hz (every 100ms).
22. Read the Egress state directly from the shared memory without cloning.
23. Apply fast binary compression (e.g., LZ4) to the Egress buffers before transmission.
24. Map active `WebSocket` connections to specific `teamId`s for contextual masking.
25. Execute `captureTeamStateBinary` to filter out hidden enemy coordinates.
26. Serialize and broadcast the `LocalTrackBuffer` (sensor-degraded tracks) for hostile entities.
27. Ensure transmitted data includes velocity vectors to support 60FPS client-side interpolation.
28. Handle WebSocket ping/pong keep-alives, connection drops, and reconnects.
29. Stream discrete combat events (e.g., `DETONATION`, `WEAPON_FIRED`) asynchronously alongside frame data.
30. Rate-limit outbound telemetry to prevent TCP backpressure and client buffer bloat.

### 4. API, Ingress & Security
31. Accept incoming WebSocket order payloads in raw JSON format.
32. Strictly validate all incoming payloads using Zod schemas (`ExecuteOrderSchema`).
33. Reject malformed payloads immediately on the Main Thread with explicit REST/Socket error codes.
34. Forward validated JSON orders to the worker via `MessagePort.postMessage`.
35. Authenticate clients via session tokens before allowing WebSocket upgrades.
36. Enforce strict type safety on all incoming command interfaces.
37. Provide REST endpoints (e.g., `POST /api/simulations/spawn`) to initialize new matches.
38. Prevent cross-tenant data leakage by sandboxing REST routes by `matchId`.
39. Validate user permissions against specific `teamId` command privileges (preventing Blue from commanding Red).
40. Drop connections that spam excessive command payloads (DDoS protection).

### 5. Simulation Game Loop (Compute)
41. Execute a strictly deterministic 100Hz `FixedStepTicker` (10ms delta time).
42. Maintain floating-point math consistency across all ticks.
43. Route validated orders into the `LocalCommandGateway`.
44. Reconcile raw user intents into actionable `TaskGraph` nodes via the `TaskReconcilerSystem`.
45. Evaluate scenario termination conditions (`assertions` array) routinely.
46. Cleanly early-exit the simulation when all doctrinal assertions evaluate to true.
47. Enforce strict execution order of ECS Systems (e.g., Kinematics must process before Collision).
48. Track simulation wall-clock time versus real-time execution speed multipliers.
49. Provide manual stepping capabilities (`StepCommand`) for step-by-step debugging.
50. Execute headless Monte Carlo batch processing jobs seamlessly alongside live interactive matches.

### 6. Physics & Kinematics
51. Calculate RK4 integration for high-G, rapid-turn missile vectors.
52. Enforce Euler integration fallbacks for standard, low-G transit to save compute.
53. Apply realistic aerodynamic drag profiles based on velocity, aspect, and altitude.
54. Starve engine thrust (`thrustN = 0`) when `fuelKg` reaches zero.
55. Enforce ballistic physics by completely ignoring PID flight controls for `CAPABILITY_BALLISTIC` entities.
56. Clamp maximum turn rates and speeds strictly based on the physical profile schemas.
57. Handle multi-stage weapon separation (`STAGE_SEPARATION`) and booster burnout.
58. Implement Z-axis clamping for naval surface vessels (stay at 0m) and submarines (stay below 0m).
59. Calculate atmospheric density variations for altitude-dependent lift.
60. Process continuous gravitational acceleration (9.81 m/s²) for all unguided projectiles.

### 7. Sensors & Electronic Warfare (EW)
61. Calculate spherical radar spreading and cross-section (RCS) aspect attenuation.
62. Enforce physical sensor horizons (e.g., strict visual limits, radar horizon curvature).
63. Inject fallback mast heights for surface vessel radar horizon calculations to prevent `sqrt(0)` bugs.
64. Calculate sonar thermocline layer masking and acoustic propagation loss.
65. Process active jamming strobes, noise floors, and burn-through ranges.
66. Generate passive ESM tracks (`Home-On-Jam`) against emitting jammers.
67. Handle `EmconMode` toggles to instantly mask all active RF emissions.
68. Spoof radar/IR seekers using deployed towed decoys or thermal flares.
69. Maintain `TrackManager` confidence scores and drop stale contacts over time.
70. Support Datalink sharing of Track Buffers across all friendly network nodes.

### 8. Combat, Damage & Weapons
71. Detonate weapons via proximity fuze when targets cross inside `detonationRangeM`.
72. Calculate inverse-square blast damage scaling based on distance from the detonation epicenter.
73. Apply armor modifiers to mitigate incoming kinetic and blast damage.
74. Scale subsystem degradation and wear-and-tear precisely over real-time (`dt`), rather than per-tick.
75. Trigger CIWS point-defense engagements automatically against incoming weapon tracks.
76. Slew weapon mounts toward targets, requiring `mountIsAligned` before authorizing fire.
77. Reject firing orders if the entity lacks the required weapon mounts or capabilities.
78. Calculate predictive lead points for unguided artillery based on target velocity vectors.
79. Reject fire orders when magazine `ammoCounts` reach 0 (Winchester).
80. Instantly decouple fired weapons from parent entity IDs (`parentIds = -1`) to prevent telepathic death cascades.

### 9. AI, Behavior & Doctrine
81. Restrict all AI decision-making strictly to the `TacticalContext` interface (preventing global omniscience).
82. Identify Friend/Foe (IFF) reliably to prevent blue-on-blue engagements.
83. Execute automated Return-To-Base (RTB) overrides when fuel hits the Bingo threshold.
84. Process complex wingman station-keeping and relative formation flying constraints.
85. Enforce Weapon Posture (`HOLD`, `TIGHT`, `FREE`) doctrine rules globally and locally.
86. Automatically activate missile internal active seekers (Pitbull) at specified ranges.
87. Evaluate Threat-Priority matrices for automated target selection.
88. Execute evasive maneuvers automatically when spiked by hostile radar or incoming weapons.
89. Traverse complex `WaypointSystem` paths utilizing navigation-tolerance radiuses.
90. Support dynamic overriding of AI behavior trees via manual interactive commands.

### 10. Logistics, Environment & Persistence
91. Execute Underway Replenishment (UNREP) exclusively between entities with matching `TraversalMedium`s.
92. Transfer fuel based on strict Kg/minute transfer rates and maximum capacities.
93. Reject refueling attempts for invalid entity categories (e.g., weapons, facilities).
94. Manage Carrier Flight Deck launch and recovery queues based on strict RPM rates.
95. Inherit parent carrier velocity vectors upon aircraft launch.
96. Emit `CAVITATION_STARTED` strictly as an edge-trigger using `b.wasCavitating` latching.
97. Capture full in-memory keyframes (binary memory dumps) every 5 minutes of sim time.
98. Hydrate late-joining clients instantly from the latest Main Thread keyframe cache.
99. Log every validated order into a `.warrepl` stream for perfect deterministic replay.
100. Hydrate initial scenario environments seamlessly from strict JSON manifests.


## 1. Objective and Scope

This document specifies the architecture for running the War-Games Engine as a multi-tenant, cloud-native service. The server must manage persistent, interactive simulation sessions isolated from one another, allowing multiple clients to connect, submit orders, and receive real-time telemetry securely.

## 2. Current Architecture & Required Evolutions

The engine is currently highly optimized for high-performance execution using a Structure of Arrays (SoA) layout via `SharedArrayBuffer` (`WorldBuffer.ts`) and provides a clean `Ingress -> Compute -> Egress` pipeline (`SimulationRuntime.ts`). 

However, the existing `SimulationCoordinator` and `SimulationWorker` are designed for short-lived, batch-processed Monte Carlo jobs. To support interactive multi-tenancy, we must transition to a persistent worker model.

## 3. Server Architecture Model

### 3.1. The Gateway-Worker Paradigm
The system will adopt a Gateway-Worker pattern.

```mermaid
graph TD
    Client[Client Apps (Web/Desktop)] <-->|WebSocket: Telemetry & Orders| Gateway[API Gateway (Node.js)]
    Gateway <-->|Redis Pub/Sub & State| SessionManager[Session & Tenant Manager]
    
    SessionManager -->|IPC / MessageChannel| WorkerManager[Worker Orchestrator]
    
    subgraph Worker Pool [Node.js Worker Threads]
        Worker1[Persistent SimWorker 1]
        Worker2[Persistent SimWorker 2]
        WorkerN[Persistent SimWorker N]
    end
    
    WorkerManager <-->|Match ID Routing| Worker1
    WorkerManager <-->|Match ID Routing| Worker2
```

### 3.2. Core Components

1.  **API Gateway (WebSocket & REST):**
    *   **REST:** Handles user authentication, tenant registration, and static asset/scenario management (`ScenarioManifest`).
    *   **WebSocket:** The primary bidirectional channel for active matches. Clients subscribe to a `matchId` and stream orders up, while receiving binary telemetry frames down.
2.  **Session & Tenant Manager:**
    *   Validates that a client (tenant) has permission to interact with a specific `matchId`.
    *   Tracks the mapping of active matches to specific physical Worker Threads/Nodes.
3.  **Worker Orchestrator (Evolution of `SimulationCoordinator`):**
    *   Spawns and monitors a fixed pool of Node.js Worker Threads (e.g., matching CPU cores).
    *   Routes incoming orders from the Gateway to the correct persistent `SimWorker` using `MessageChannel`.
4.  **Persistent `SimWorker` (Evolution of `SimulationWorker`):**
    *   Maintains a long-running instance of `SimulationRuntime`.
    *   Loops continuously based on the target `ticksPerSecond`.
    *   **Ingress Phase:** Polls the `MessageChannel` for validated orders and pushes them to the `OrderQueue`.
    *   **Compute Phase:** Executes the ECS system pipeline.
    *   **Egress Phase:** Extracts state deltas and pushes them back to the Gateway.

## 4. State Synchronization and Telemetry

The server will leverage the engine's existing high-performance binary serialization capabilities.

1.  **Full State Sync:** When a client first connects (or reconnects), the worker invokes `ECSRegistry.captureStateBinary()` to send the complete world state.
2.  **Delta Telemetry (Streaming):** During normal operation, the worker invokes `ECSRegistry.captureDeltaStateBinary()` during the Egress phase to generate a minimal footprint binary patch.
3.  **Transport:** Deltas are transferred from the Worker to the Gateway via `MessagePort.postMessage()` (using transferable objects if possible) and then broadcast over WebSockets to authenticated subscribers.

## 5. Order Ingestion and Security

To ensure engine stability, the engine must be completely shielded from malformed client input.

1.  **Validation:** All incoming orders over WebSocket must be validated by the Gateway using `buildDynamicCommandSchema()` (`src/engine/meta/SchemaValidator.ts`).
2.  **Schema Enforcement:** Only structural JSON payloads that pass the Zod validation are forwarded to the Worker.
3.  **Task Compilation:** Inside the worker, the `TaskReconcilerSystem` (and `IntentCompiler`) safely translates the raw validated JSON orders into internal state changes and DAGs.
4.  **Memory Isolation:** Because each `SimWorker` runs in a separate Node.js isolate, a crash or memory leak in one match (e.g., massive entity spawning) will crash that specific worker thread, but will not corrupt the memory of other tenants or the Gateway. The Orchestrator will catch the worker exit and spin up a replacement, marking the match as failed.

## 6. Persistence and Replay

*   **Deterministic Replays:** Every validated order is logged by the API Gateway to a persistent store (e.g., Redis Streams, AWS S3) along with the initial `ScenarioManifest` and random seed. This forms a `.warrepl` log.
*   **Reconstruction:** Matches can be perfectly reconstructed headless by feeding the `.warrepl` log into a new `SimWorker`.

## 7. Scalability

*   **Vertical Scaling:** Maximize density on a single box by running one Worker Thread per physical CPU core.
*   **Horizontal Scaling:** Introduce a Redis Pub/Sub layer. The Load Balancer routes WebSocket connections to any API Gateway. The Gateway uses Redis to look up which Node holds the Worker for a given `matchId`, proxying the IPC messages across the network if necessary (or enforcing sticky sessions at the LB level).

---

# Multi-Tenant Simulation Server Specification (Bare-Metal V2)

## 1. Objective and Scope
This document specifies the architecture for running the War-Games Engine as a multi-tenant service natively within a single, high-density Node.js environment. The server must manage persistent, interactive simulation sessions isolated from one another, utilizing raw worker_threads and SharedArrayBuffer to achieve zero-copy memory synchronization and maximum CPU utilization without relying on external infrastructure (no Redis, no Kubernetes).

## 2. Server Architecture Model
The system relies on a strict Gateway (Main Thread) and Worker (Background Thread) separation, where the Gateway owns the memory and the Worker computes the physics.

### 2.1. Core Components
**API Gateway & Session Manager (Main Thread):**
*   Handles all WebSocket connections and REST endpoints.
*   Manages authentication, tenant validation, and matchId routing.
*   Memory Owner: Allocates the WorldBuffer (SharedArrayBuffer) for every active match.

**Persistent SimWorker (Worker Thread):**
*   A long-running instance of SimulationRuntime.
*   Contains the FixedStepTicker (100Hz) and the ECS Systems pipeline.
*   Does not allocate memory; it binds its ECSRegistry views to the pointers provided by the Gateway.

## 3. Zero-Copy IPC & State Synchronization
To prevent Egress serialization from starving the V8 garbage collector, the server strictly prohibits copying physical state memory between threads.

*   **The Handshake:** Upon match creation, the Gateway instantiates the WorldBuffer. It spawns the SimWorker and passes the SharedArrayBuffer reference via workerData.
*   **Compute Phase:** The Worker runs its 100Hz loop, mutating the shared memory directly.
*   **Egress Phase (Zero-Copy):** The Gateway thread holds a read-only view of the exact same memory. The Gateway reads directly from the SharedArrayBuffer to build the network packets. MessagePort.postMessage is ONLY used for small, localized event triggers, never for world state.

## 4. Asynchronous Tick Decoupling
To prevent network backpressure from crashing the simulation pipeline, the Compute Tick and Network Tick are strictly decoupled.

*   **The Compute Tick (100Hz):** The Worker executes the physics loop every 10ms.
*   **The Network Tick (10Hz):** The Gateway's broadcast loop executes every 100ms. It reads the current state of the SharedArrayBuffer, applies binary delta-compression, and transmits.
*   **Client Interpolation:** The frontend receives 10Hz updates and uses the provided velocitiesX/Y/Z to interpolate visual frames smoothly at 60FPS.

## 5. Contextual Egress (Security & Omniscience Firewall)
The Gateway cannot blindly broadcast the raw SharedArrayBuffer, as it contains the exact coordinates of every unit, enabling client-side cheating.

*   **Masking:** During the 10Hz Network Tick, the Gateway checks the WebSocket -> TeamID mapping for each connected client.
*   **Hydration:** The Gateway calls ECSRegistry.captureTeamStateBinary(teamId).
*   **Filtering:** This method reads the shared memory but only extracts raw physical coordinates for friendly units. For hostile units, it serializes the data exclusively from that Team's LocalTrackBuffer (sensor-degraded positions).

## 6. Fault Tolerance & In-Memory Hydration
Because we are operating bare-metal without Kubernetes, the Main Thread acts as the primary orchestrator and state back-up.

*   **In-Memory Keyframing:** Every 5 minutes of simulation time, the Gateway performs a full captureStateBinary() and caches it in a local Map<matchId, Uint8Array>.
*   **Worker Revival:** If a SimWorker crashes (e.g., infinite loop, OOM), the Gateway catches the worker.on('error') event. The Gateway instantly spawns a new worker, passes it the surviving SharedArrayBuffer pointer, and the simulation continues with zero data loss.
*   **Late-Joiner Protocol:** When a client drops and reconnects, the Gateway instantly pushes the latest binary Keyframe from the local Map to hydrate the client's board, then resumes the live 10Hz stream.

## 7. Order Ingestion
*   **Validation:** Incoming WebSocket JSON payloads are validated against Zod schemas on the Gateway.
*   **Ingress Routing:** Validated payloads are sent to the Worker via postMessage.
*   **Reconciliation:** The Worker's TaskReconcilerSystem safely compiles the user intents into the TaskGraph, ensuring malicious inputs cannot corrupt the state buffers.
# WarGames: Server & SDK Architecture Deep Review

## 1. Executive Summary
The 'war-games' project utilizes a sophisticated, contract-driven architecture (V2) that provides strong type safety at the boundaries of the Simulation Engine, Server, and AI Agents. The system is built around a "Unified Tool Contract" pattern using Zod for schema enforcement. However, while the architectural *design* is robust, the *implementation* frequently bypasses the project's strict engineering standards (specifically regarding the use of `any`), and there are instances of direct engine state access that bypass the intended command-driven workflow.

---

## 2. API/SDK Design: Unified Tool Contract (V2)

### 2.1 The Contract Pattern
The core of the V2 architecture is the `ToolContract`, defined in `src/sdk_v2/contracts/core/tool_contract.ts`. This pattern enforces a strict separation between interface and implementation.

*   **Source of Truth:** All capabilities are defined as contracts (e.g., `src/sdk_v2/contracts/combat/combat.contracts.ts`) using `defineContract`.
*   **Zod Enforcement:** Every contract defines an `inputSchema` and `outputSchema`. The system uses `z.infer` to ensure that both the generated SDK and the server implementation are perfectly synchronized.
*   **Automatic Routing:** `src/server_v2/core/route_generator.ts` uses these contracts to auto-generate Fastify routes, including sophisticated type coercion for URL parameters and query strings.

### 2.2 The Generated SDK
The SDK (`src/sdk_v2/generated/WarGamesClientV2.ts`) is a 1:1 reflection of the contracts.
*   **Type Integrity:** Methods are fully typed using Zod inference, providing a "zero-effort" type-safe bridge for the UI and external scripts.
*   **Split Server Logic:** The SDK's `getBaseUrl` logic implements an architectural split, routing heavy geodetic/terrain math to a specialized `Terrain Server` while match-specific logic goes to the `API Server`.

---

## 3. Tool Implementation & Execution

### 3.1 Implementation Split
Server-side logic is isolated in `src/server_v2/tools/` using the `defineTool` wrapper. This ensures that the engine logic never leaks into the shared contract files.

*   **Example (Nav Update):** `src/server_v2/tools/nav/nav_update.ts` correctly reads from ECS components for its return value but uses `queueExternalCommand` for state modifications.
*   **Example (Combat Fire):** `src/server_v2/tools/combat/combat_fire.ts` executes a `FireWeaponCommand`, maintaining the integrity of the engine's command-processing loop.

### 3.2 Architectural Bypasses
While the command pattern is the standard, a few "bypasses" were identified where the server interacts directly with engine state:
*   **`match_update` (`src/server_v2/tools/match/match_update.ts`):** Directly reads `handle.world.stats` to return scores. While read-only access is generally safer, it bypasses the potential for consistent state snapshots.
*   **`MatchHandle` (`src/server_v2/services/MatchService.ts`):** The `zones` map is defined as `Map<string, unknown>`. This is a weak point in the otherwise strict ECS structure.

---

## 4. Service Layer Integrity

### 4.1 Match & Simulation Service
The `MatchService` (`src/server_v2/services/MatchService.ts`) is the heartbeat of the system. It manages the ECS `World` lifecycle, system registration, and the high-speed simulation runner.
*   **Robustness:** It correctly handles database hydration of entity profiles and weapon profiles using Zod parsing during match creation.
*   **Persistence:** It integrates `ParquetService` for high-throughput telemetry and event logging, ensuring that simulation runs are durable and analysable.

### 4.2 Terrain & Spatial Data
The `TerrainService` (`src/server_v2/services/TerrainService.ts`) implements a sophisticated 3-level cache (RAM -> Disk/SQLite -> Remote Oracle).
*   **Worker Offloading:** Heavy terrain baking tasks are offloaded to a worker pool (`src/server_v2/services/WorkerService.ts`), preventing the main event loop from blocking during JIT terrain harvesting.

---

## 5. AI/LLM Integration: Tool-Centric Agents

The `WarGamesAgent` (`src/llm/WarGamesAgent.ts`) and `AgentService` (`src/server_v2/services/AgentService.ts`) treat the simulation engine as a suite of tools.
*   **Dynamic Orchestration:** The agent uses the `OllamaAdapter` to translate natural language into tool calls. These tool calls are dynamically routed through the generated SDK.
*   **Authorization:** The agent implements a per-agent `allowedTools` whitelist, providing a critical security layer for AI interactions with the engine.

---

## 6. Engineering Standards Compliance Audit

The project's `GEMINI.md` mandates an "Absolute Ban on `any`". This review found **extensive violations** of this rule across the service and core layers.

### 6.1 Critical Violations
1.  **`ParquetService` (`src/server_v2/core/ParquetService.ts`):** Uses `any` for `writer`, `schema`, and `row`.
    *   *Line 6-7:* `private writer: any; private schema: any;`
    *   *Line 51:* `async writeRow(row: any)`
2.  **`WorkerService` (`src/server_v2/services/WorkerService.ts`):** Uses `any` for jobs and job queues.
    *   *Line 30:* `private readonly workers: Array<{ ..., currentJob: any }> = [];`
    *   *Line 31:* `private readonly jobQueue: Array<{ job: any, ... }> = [];`
3.  **`TerrainService` (`src/server_v2/services/TerrainService.ts`):** Uses `any` to avoid circular dependencies and for worker messages.
    *   *Line 40:* `private readonly harvesterService?: any`
    *   *Line 196:* `pool.execute<any>({ ... })`
4.  **`AgentService` (`src/server_v2/services/AgentService.ts`):** Uses `any` for configuration and message parsing.
    *   *Line 131:* `(m.toolCalls as any)?.map((tc: any) => ...)`
5.  **`WarGamesAgent` (`src/llm/WarGamesAgent.ts`):** Uses `any` for SDK routing.
    *   *Line 84:* `const domainApi = (this.client.api as any)[contract.domain];`

### 6.2 The "Any" Code Smell
The widespread use of `any` in core services (Parquet, Worker, Terrain) represents a significant risk to the long-term stability of the system. While often used to interface with libraries (like `parquetjs`) or to bypass circular dependencies, it masks structural errors and undermines the purpose of the V2 architecture.

---

## 7. Recommendations

1.  **Typing Internal Boundaries:** Replace `any` in `WorkerService` and `ParquetService` with generic types or `unknown` combined with type guards.
2.  **Circular Dependency Resolution:** Replace `harvesterService: any` in `TerrainService` with a dedicated interface (`IHarvesterService`) defined in a shared types file.
3.  **SDK Indexing:** Fix the dynamic indexing in `WarGamesAgent` by using a properly typed mapping or a type-safe `keyof` check instead of casting the client to `any`.
4.  **Command Pattern Consistency:** Refactor `match_update` to use the command pattern for gathering stats if possible, or at least define a formal `IWorldStats` interface to avoid direct ECS component leakage.

---
**End of Report**

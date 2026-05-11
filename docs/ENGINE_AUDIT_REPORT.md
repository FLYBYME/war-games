# Definitive Master Audit: Engine & SDK "Fuckups" (May 11, 2026)

## Executive Summary
This report is the result of an exhaustive, 10-agent parallel audit of the entire codebase. The findings confirm a catastrophic failure to adhere to the simulation's intended architecture. The system is currently "hollow": the engine is silent, the server is a bypass, and the client is a reactive facade built on request-response lies.

---

## 1. Core Architectural "Bypass" (Direct Mutations)
The system's "Single Source of Truth" is non-existent. Direct mutation of state is the standard, not the exception.

- **`MatchService.ts` & `MatchHandle`**: Directly mutates `world.isPaused` and `clock.timeCompression`, bypassing the Command Dispatcher and silencing the Event Bus.
- **`sim_update.ts` (API Tool)**: Mutates match state directly.
- **`World.ts`**: Setters for `isPaused` mutate the clock directly.
- **`SimulationClock.ts`**: All temporal state is public and mutable by any service with a reference.

## 2. The "Silent" Engine (66% Telemetry Blackout)
The vast majority of simulation actions produce **zero** events. The client is blind to almost everything that happens in the simulation loop.

- **Silent Handlers (0% Emission)**:
  - `PhysicsCommandHandlers.ts` (All: `SetPosition`, `SetHeading`, `SetSpeed`, `SetAltitude`).
  - `DoctrineCommandHandlers.ts` (All: `SetROE`, `UpdateWRARules`, `AssignWeapon`).
  - `NavigationCommandHandlers.ts` (All: `AddWaypoint`, `ClearWaypoints`, `Formation`).
  - `TrackCommandHandlers.ts` (All: `CreateTrack`, `DropTrack`).
  - `EnvironmentCommandHandlers.ts` (All).
  - `SystemCommandHandlers.ts` (`SpawnEntityHandler` is silent).
- **Hardcoded Forensic Failure**: `CombatCommandHandlers.ts` uses `killerId: 'unknown'` for destruction events, making it impossible for the client or AI to know who destroyed what.

## 3. The "Dead Code" Systems (Orphaned Plumbing)
Critical logic exists in the codebase but is never loaded into the simulation runtime.

- **`ViewStateSystem`**: **TOTAL UI BLACKOUT**. This system generates side-specific filtered snapshots for the UI. It is NEVER registered in `MatchService`, so the UI receives no spatial updates.
- **`ConditionSystem`**: Handles damage spread (fire/flooding). Orphaned.
- **`MovementSystem`**: Orphaned kinematic logic.
- **`OrbitalPhysicsSystem`**: Disconnected from the match runtime.
- **`MapDataService`**: Never initialized, meaning the UI has no geographic context for telemetry.

## 4. The "Reactive Facade" (Client-Side Integrity Failure)
The client is architecturally broken by forced request-response loops.

- **`SimulationService.ts`**: Manually overrides its reactive signals (`isPaused`, `timeCompression`, `currentTick`) using tool responses instead of waiting for SSE events.
- **`MatchExtension.ts`**: Bypasses the `SimulationService` entirely, calling the raw API and forcing UI updates.
- **`SimStreamService.ts`**: Fails to handle SSE disconnects, leading to silent UI hangs.

## 5. Engineering Standard Violations (GEMINI.md)
The codebase shows total disregard for the project's own engineering standards.

- **100% Violation of Rule 2 (Zod Schemas)**: **Zero** engine components (`src/engine/components/`) are defined using Zod schemas. They are raw classes with zero metadata.
- **100% Violation of Rule 6 (Descriptions)**: No component fields have `.describe()` annotations, breaking AI agent tool generation.
- **Serialization Failure**: Critical components (Logistics, Track, Sensors, Group) use `Map` and `Set` types, which **cannot be serialized to JSON**. This means the telemetry stream will fail or send empty objects for these critical fields.
- **The `any` Plague**: Extensive use of `as any` and `any` in `ComponentRegistry.ts`, `ToolRunnerExtension.ts`, and `ChatService.ts`.

---

## 6. Remediation Roadmap: The Structural Overhaul
1.  **Intent-Driven Tools**: Kill `sim_update`. Implement `sim_pause`, `sim_resume`, and `sim_set_speed`.
2.  **Command-Event Enforcement**: Refactor `MatchHandle` and all tools to use `world.queueExternalCommand()`. **Direct mutation must be a lint error.**
3.  **Component Zodification**: Rewrite all engine components as Zod-backed schemas to enable serialization and AI documentation.
4.  **Telemetry Heartbeat**: Wire `ViewStateSystem` and `MapDataService` into the match lifecycle.
5.  **Handler Audit**: Add event emissions to every single silent handler.
6.  **Event-Driven Client**: Refactor the UI to be 100% driven by the SSE stream. No manual signal setting from tool responses.

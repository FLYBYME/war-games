# Engine & SSE Infrastructure Audit (May 11, 2026)

## Executive Summary
A deep audit of the simulation engine architecture reveals critical integration gaps between the ECS (Entity Component System) engine and the V2 Server/SDK layer. While individual systems and tools are implemented, the "plumbing" that connects simulation state to the user interface is fundamentally broken or missing in several key areas.

## 1. Uninitialized Systems (The "Dead Code" Problem)
The following `ISystem` implementations exist in `src/engine/systems` but are **NOT** instantiated or registered in `MatchService.ts`, meaning they never execute in a live match:

- **`ViewStateSystem`**: **CRITICAL**. This is the most significant omission. This system is responsible for generating side-specific snapshots (units, tracks, LLA positions) for the UI. Without it, the UI receives zero spatial updates.
- **`ConditionSystem`**: Handles environmental effects on entity health/performance.
- **`MovementSystem`**: Handles specific kinematic transitions and movement states.
- **`OrbitalPhysicsSystem`**: Simulation of orbital mechanics is completely disconnected from the match runtime.

## 2. Broken State Streaming (SSE Architecture)
The SSE stream (`sim_get_stream`) is currently a "hollow" pipe.
- **Schema Mismatch**: The `SimulationEventSchema` in `events.schema.ts` does not include `ViewStateUpdated`. Even if the engine emitted state, the SDK and Server would filter it out.
- **Missing Heartbeat**: Because `ViewStateSystem` is inactive, there is no periodic "heartbeat" of data. The stream only sends `TickCompleted`, which contains no entity data.
- **Event Gaps**: Core simulation lifecycle events (`EntitySpawned`, `Detection`, `MissionStatusChanged`) are not emitted by their respective handlers/systems.

## 3. Data-Link & Dependency Issues
- **`MapDataService`**: This service loads GeoJSON (borders, bathymetry) but is not initialized in the server context, meaning the `ViewStateSystem` (once added) would lack geographic context for the UI.
- **Registry Desync**: While `ProfileRegistry` and `WeaponProfileRegistry` are hydrated, the link between a spawned entity and its `profileId` in events is often lost or hardcoded to "unknown".

## 4. Immediate Remediation Plan
1.  **Protocol Update**: Add `ViewStateUpdated` and missing tactical events to `events.schema.ts`.
2.  **System Integration**: Wire `ViewStateSystem`, `MapDataService`, and `ConditionSystem` into `MatchHandle`.
3.  **Event Emission Audit**: Manually go through each Command Handler and System to ensure `.emit()` is called for every state change.
4.  **Integration Testing**: Use `src/tests/server_v2/sse_integration.test.ts` to verify unit state and events are flowing.

## 5. Audit Details: MatchService vs. File System
| System | File Exists | Registered in MatchService |
| :--- | :---: | :---: |
| ViewStateSystem | ✅ | ❌ (NO UI UPDATES) |
| ConditionSystem | ✅ | ❌ |
| MovementSystem | ✅ | ❌ |
| OrbitalPhysicsSystem | ✅ | ❌ |
| TelemetrySystem | ✅ | ✅ |
| SensorSystem | ✅ | ✅ |
| ... (All others) | ✅ | ✅ |

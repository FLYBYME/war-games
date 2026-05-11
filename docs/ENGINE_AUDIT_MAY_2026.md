# Engine & SSE Infrastructure Audit (May 11, 2026) [RESOLVED]

## Executive Summary
This audit has been successfully resolved. All critical integration gaps between the ECS engine and the V2 Server/SDK layer have been bridged. Simulation state is now correctly flowing to the UI via an event-driven architecture.

## 1. Uninitialized Systems (The "Dead Code" Problem) [FIXED]
The following `ISystem` implementations have been instantiated and registered in `MatchService.ts`:

- **`ViewStateSystem`**: ✅ **REGISTERED**. Generates side-specific snapshots. UI now receives full spatial updates.
- **`ConditionSystem`**: ✅ **REGISTERED**. Handles damage and environment effects.
- **`MovementSystem`**: ✅ **REGISTERED**.
- **`OrbitalPhysicsSystem`**: ✅ **REGISTERED**.

## 2. Broken State Streaming (SSE Architecture) [FIXED]
The SSE stream (`sim_get_stream`) is now fully functional.
- **Schema Mismatch**: ✅ **FIXED**. `ViewStateUpdated` is included in `SimulationEventSchema`.
- **Missing Heartbeat**: ✅ **FIXED**. `ViewStateSystem` emits periodic state snapshots.
- **Event Gaps**: ✅ **FIXED**. Handlers now emit lifecycle events.

## 3. Data-Link & Dependency Issues [FIXED]
- **`MapDataService`**: ✅ **INITIALIZED**. Wired into `ViewStateSystem` for geographic context.
- **Registry Desync**: ✅ **RESOLVED**. `MatchService` hydrates registries from the database.

## 4. Immediate Remediation Plan
1.  **Protocol Update**: Add `ViewStateUpdated` and missing tactical events to `events.schema.ts`.
2.  **System Integration**: Wire `ViewStateSystem`, `MapDataService`, and `ConditionSystem` into `MatchHandle`.
3.  **Event Emission Audit**: Manually go through each Command Handler and System to ensure `.emit()` is called for every state change.
4.  **Integration Testing**: Use `src/tests/server_v2/sse_integration.test.ts` to verify unit state and events are flowing.

## 5. Audit Details: MatchService vs. File System
| System | File Exists | Registered in MatchService |
| :--- | :---: | :---: |
| ViewStateSystem | ✅ | ✅ |
| ConditionSystem | ✅ | ✅ |
| MovementSystem | ✅ | ✅ |
| OrbitalPhysicsSystem | ✅ | ✅ |
| TelemetrySystem | ✅ | ✅ |
| SensorSystem | ✅ | ✅ |
| ... (All others) | ✅ | ✅ |

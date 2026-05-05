# Infrastructure Components

This document covers the utility and data-transfer classes that support the engine's core simulation loop.

## 1. EventBus
The `EventBus` is a tick-bound buffer for discrete simulation events.

- **Role**: Collects events like `IMPACT`, `NEW_CONTACT`, or `WEAPON_FIRED` during a tick.
- **Lifecycle**: 
    - Systems `emit()` events throughout the tick.
    - The `Engine` flushes the bus at the end of every jump (`runJump`) to generate a `TurnSnapshot`.
- **Filtering**: The bus allows external listeners (like metrics trackers) to subscribe to specific event types.

## 2. OrderQueue
The `OrderQueue` is a thread-safe buffer for player and AI input.

- **Role**: Orders (like "Set Heading") arrive asynchronously between ticks (via network or UI).
- **Sorting**: When the queue is drained at the start of a tick, it sorts all orders chronologically by their `timestamp`.
- **Validation**: While the `Engine` validates orders against Zod schemas, the `OrderQueue` ensures they are processed in the correct order to maintain causality.

## 3. ProfileRegistry
The `ProfileRegistry` is the database of static entity and subsystem definitions.

- **Role**: Loads JSON profiles from disk at startup.
- **Validation**: Every profile is validated against Zod schemas to ensure it contains required fields like `maxSpeed`, `maxHp`, etc.
- **Telemetry Audit**: The registry uses a **Proxy-based Tracking System**. It logs every single JSON path that the engine actually reads during a simulation. This allows developers to identify "dead data" in the profiles that is never used by the logic.

## 4. PhysicsConstants
Centralized repository for universal simulation constants.

- **Key Constants**:
    - `GRAVITY_G`: 9.81 m/s².
    - `RHO_AIR`: 1.225 kg/m³.
    - `WAYPOINT_REACH_THRESHOLD_M`: 500m.
    - `RADAR_MIN_SNR_DB`: 10.0 dB.
- **Conversions**: Provides standard factors for `KTS_TO_MPS`, `NM_TO_M`, and `DEG_TO_RAD`.

## 5. Types
The `Types.ts` file is the central source for all enums and interfaces used in the engine. It contains no logic, only structural definitions like `SimEventType`, `DirtyFlags`, and `EntityCategory`.

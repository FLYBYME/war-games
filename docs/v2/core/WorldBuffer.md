# WorldBuffer

The `WorldBuffer` is the "Source of Truth" for all numeric simulation data. It implements a **Structure-of-Arrays (SoA)** memory layout designed for extreme performance and cache locality.

## Core Architecture

All data is stored in **SharedArrayBuffer**-backed typed arrays. This design allows the simulation state to be shared between the main thread and worker threads without expensive serialization.

---

## 1. Data Layout (Stride-based)

The buffer is partitioned into several functional groups. While most arrays are indexed directly by `EntityId`, some use a "Stride" to store multiple values per entity.

### Multi-Value Strides:
- **Component Health**: 8 slots per entity (Engines, Radar, Sonar, etc.).
- **Mounts**: 4 slots per entity (Azimuth, Slew Rate, Ammo, etc.).
- **Electronic Warfare**: 5 slots per entity (Noise floors for L, S, C, X, and KU bands).

---

## 2. Precision & Performance

- **Float64**: Used for global `X` and `Y` positions to maintain sub-meter precision over large (1000km+) maps.
- **Float32**: Used for velocities, rotations, signatures, and health.
- **Uint8 / Int32**: Used for bitmasks, categories, team IDs, and counters.

---

## 3. Dirty Tracking

The buffer includes a `dirtyMasks` array and a `globalDirtyMask`.
- **Purpose**: Systems set bits in the `dirtyMasks` when they modify an entity.
- **Optimization**: The networking and UI layers use these masks to only transmit or re-render entities that have actually changed since the last update.

---

## 4. Memory Management

- **Fixed Allocation**: The buffer is pre-allocated at startup for `MAX_ENTITIES` (2048).
- **Zeroing**: The `clearIndex(id)` method performs a "hard reset" of all arrays for a specific entity ID, ensuring no stale data remains when an ID is recycled.

# ECSRegistry

The `ECSRegistry` is the primary interface for managing entity state. It bridges the high-level system logic with the low-level, high-performance `WorldBuffer`.

## Core Architecture

The registry uses a **Hybrid ECS** approach:
1.  **Numeric Data**: Stored in `WorldBuffer` using SharedArrayBuffer-backed typed arrays for maximum performance and future worker-thread parallelism.
2.  **Object Data**: Complex structures (like Behavior Trees, Sensor lists, or Waypoint queues) are stored in standard arrays indexed by `EntityId`.

---

## 1. Entity Lifecycle

- **Allocation**: The registry uses a `freeStack` to manage entity IDs. Allocation is $O(1)$.
- **Generations**: Each time an ID is recycled, its `generation` in the buffer is incremented. This allows "stale" references (like a missile targeting a now-dead ship) to be safely identified.
- **Cleanup**: When an entity is freed, all its numeric data and object components are zeroed out to prevent "ghost" data from affecting the next entity that takes that ID.

---

## 2. Property Access (Metadata Driven)

The registry provides type-safe getters and setters:
- `getProp(id, key)` / `setProp(id, key, value)`
- **Metadata Integration**: These methods use a schema registry to know if a property lives in the `WorldBuffer` or an object array.
- **Automatic Conversions**: The registry can perform unit conversions (e.g., `dBsm` to linear $m^2$) during setters based on the property metadata.
- **Dirty Tracking**: Setting properties automatically triggers `DirtyFlags` (e.g., setting `speed` marks the entity as `Kinematics` dirty).

---

## 3. Tactical Persistence

### Detection Bitset
A compact bit-matrix (`entities x teams`) stored in the `WorldBuffer`. It is cleared every tick and repopulated by the `SensorSystem`.

### Known Contacts
A persistent bitset that tracks which entities a team has *ever* seen. This allows the system to distinguish between a "New Contact" and a "Re-acquired Contact."

---

## 4. Snapshot Extraction

The registry is responsible for "Capturing" the world state:
- **`captureEntitySnapshot(id)`**: Generates a rich object for a single entity.
- **`captureStateBinary()`**: Dumps the entire numeric state into a contiguous `Uint8Array`. This is the core of the replay and networking system.

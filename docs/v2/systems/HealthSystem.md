# HealthSystem

The `HealthSystem` manages entity destruction, child entity cleanup, and the degradation of subsystems as units take damage. It ensures that critical systems like propulsion and sensors reflect the current physical state of the entity.

## Core Architecture

The system evaluates all entities each tick to check for death conditions and apply performance penalties based on current health levels.

### Priority & Update Cycle
- **Priority**: 80 (Executes after `CollisionSystem` has applied damage).
- **Target**: All alive entities.

---

## 1. Damage Effects & Degradation

Subsystems begin to fail or degrade as the entity's HP ratio (`hp / maxHp`) decreases:

| HP Ratio | Effect |
| :--- | :--- |
| **< 50%** | **Propulsion Degradation**: `propulsionHealth` and `speedModifier` are reduced linearly. |
| **< 30%** | **Sensor Failure**: All active sensors (Radar, Sonar) are forcibly disabled. |
| **< 25%** | **Critical Alert**: Emits a `CriticalDamage` event. |

### Component Damage (`processComponentDamage`)
The system monitors a 8-slot `componentHealth` array for each entity. If a specific component's health reaches zero, the corresponding system is disabled:
- **Engines (Slot 0)**: Sets `propulsionHealth` and `speedModifier` to 0.
- **Radar (Slot 1)**: Disables all radar sensors.
- **Sonar (Slot 2)**: Disables all sonar sensors.
- **Comms (Slot 3)**: Disables `commIsActive` status.

---

## 2. Destruction & Cleanup

When an entity's `hp` reaches 0:
1. **Event**: Emits `EntityDestroyed` with the final world coordinates.
2. **Recursive Cleanup**: Searches for any "child" entities (e.g., embarked aircraft, missiles in flight launched by this unit) and destroys them with the reason `PARENT_DESTROYED`.
3. **Memory Management**: Calls `reg.free(id)` to return the entity ID to the pool.

---

## 3. Data Access (World Buffer)

| Field | Access | Description |
| :--- | :--- | :--- |
| `hp` | **Read/Write** | Reads health to check for death; Writes 0 to children. |
| `maxHp` | Read | Used to calculate damage ratios. |
| `propulsionHealth`| **Write** | Reduced as HP falls or when Engines component is destroyed. |
| `speedModifier` | **Write** | Directly impacts the entity's max achievable speed. |
| `componentHealth` | Read | Stride-8 array monitoring individual subsystems. |
| `commIsActive` | **Write** | Set to 0 if Comms component is destroyed. |
| `parentIds` | Read | Used to identify children for recursive destruction. |
| `positionsX/Y/Z` | Read | Used for destruction event coordinates. |
| `teamIds` | Read | Used for event telemetry. |

---

## 4. Events

- **CriticalDamage**: Triggered when a unit is severely damaged (< 25% HP).
- **EntityDestroyed**: Triggered when a unit or its child is removed from the simulation.
- **ComponentDestroyed**: Triggered when a specific subsystem (Engines, Radar, etc.) is knocked out.

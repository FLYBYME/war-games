# MissionSystem

The `MissionSystem` manages high-level mission objectives and the autonomous behavior of groups of entities. It acts as an orchestrator that translates mission-level goals (like "Combat Air Patrol" or "Strike") into specific commands for individual units.

## Core Architecture

The system uses a **Mission Instance** pattern. While the ECS Registry stores the data, the `MissionSystem` maintains a map of active mission logic objects (`IMission`) that perform the heavy lifting.

### Priority & Update Cycle
- **Priority**: 55 (Executes after sensors but before final movement/combat decisions).
- **Target**: All entities assigned to a mission via a `MissionComponent`.

---

## 1. Mission Lifecycle

### Creation & Initialization
- **Factory**: Missions are created via a `MissionFactory` based on a type string (e.g., "CAP", "ASW_PATROL").
- **Context**: When initialized, missions receive a `MissionContext` containing references to the ECS Registry, Profile Registry, and Track Manager.

### Execution (`update`)
Every tick, the system:
1. Iterates through all active mission instances and calls their `update` method.
2. The mission logic then inspects its assigned units and targets, issuing orders (waypoints, ROE changes, sensor commands) directly to the entities.

### Synchronization
The system ensures that the ECS `MissionComponent` on each entity remains in sync with the mission's state, allowing the UI and networking layers to reflect mission progress.

---

## 2. Mission Types & Logic

Missions typically handle:
- **Station Keeping**: Managing waypoints for a patrol area.
- **Target Prioritization**: Assigning specific tracks to specific units in the mission group.
- **EMCON/ROE Management**: Adjusting unit postures based on the mission phase (e.g., "Go Active" when entering the strike zone).

---

## 3. Data Access (World Buffer)

The `MissionSystem` primarily acts as a "writer" of high-level state, though the individual mission instances read extensively from the buffer.

| Field | Access | Description |
| :--- | :--- | :--- |
| `hp` | Read | Missions skip dead entities. |
| `DirtyFlags.Mission`| **Write** | Set whenever a mission updates to trigger UI/Network sync. |

*Note: Individual mission implementations (like `CAPMission`) will read positions, fuel, and track indices to make tactical decisions.*

---

## 4. Mission Context

The `MissionContext` provided to mission logic includes:
- **Registry**: For reading unit states.
- **Profiles**: For checking unit capabilities (range, speed).
- **TrackManager**: For identifying and prioritizing threats.
- **Tick/DT**: For timing and rate-based logic.

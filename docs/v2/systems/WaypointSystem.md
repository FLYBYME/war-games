# WaypointSystem

The `WaypointSystem` is the primary navigation component for player-controlled and autonomous units. It manages the movement of entities along a series of coordinates, adjusting their heading and speed to follow the assigned path.

## Core Architecture

The system operates by inspecting the `waypoints` queue for each entity. It calculates the steering commands required to reach the next waypoint and transitions through the list as each destination is reached.

### Priority & Update Cycle
- **Priority**: 5 (Executes very early, before `FormationSystem` and `KinematicsSystem`).
- **Target**: All alive entities with an active waypoint list.

---

## 1. Navigation Logic

### Steering to Waypoint
Every tick, the system:
1. Calculates the distance to the first waypoint in the queue.
2. Computes the required `targetHeading` (bearing) from the entity's current position to the waypoint.
3. Sets the entity's `targetSpeeds` based on the waypoint's specific speed requirement (if defined) or a fallback cruise speed.

### Waypoint Arrival
A waypoint is considered "reached" when the entity comes within a specific threshold (`Physics.WAYPOINT_REACH_THRESHOLD_M`). 
- **Transition**: The current waypoint is shifted out of the queue, and the entity begins navigating to the next one.
- **Completion**: When the final waypoint in the list is reached, the system emits a `RouteCompleted` event.

---

## 2. Data Access (World Buffer)

| Field | Access | Description |
| :--- | :--- | :--- |
| `hp` | Read | Navigation is disabled for dead entities. |
| `positionsX/Y` | Read | Current world coordinates used for bearing calculations. |
| `targetHeadings` | **Write** | Updated to point toward the active waypoint. |
| `targetSpeeds` | **Write** | Updated to match the waypoint's requested speed or cruise speed. |

---

## 3. Implementation Details

- **Conflict Resolution**: Because this system has a high priority (5), its commands can be overridden by lower-priority systems like `FormationSystem` (Priority 6) or `BehaviorSystem` (Priority 60) if they are active and need to take control of the entity's kinematics.
- **Dirty Flags**: Sets `DirtyFlags.Kinematics` whenever heading or speed targets are modified.

---

## 4. Events

- **RouteCompleted**: Emitted when an entity has reached the final coordinate in its assigned path and has no remaining waypoints.

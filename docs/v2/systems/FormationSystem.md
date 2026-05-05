# FormationSystem

The `FormationSystem` ensures that escort units maintain a specific geometric position (station) relative to a "guide" unit (usually a high-value unit like a carrier).

## Core Architecture

Each escort unit calculates its desired world position every tick based on the guide's current state. The system then manipulates the escort's `targetHeadings` and `targetSpeeds` to steer it toward its assigned station.

### Priority & Update Cycle
- **Priority**: 6 (Executes after `WaypointSystem` but before `KinematicsSystem`).
- **Effect**: Formation commands override manual waypoints unless the formation is broken.

---

## 1. Station Calculation

The "station" is a world coordinate defined by:
- **Guide State**: The guide's current position and heading.
- **Relative Offset**: A `bearingFromGuide` (degrees) and `distanceFromGuideMeters`.
- **Absolute Angle**: `guideHeading + bearingFromGuide`.

The station moves dynamically with the guide. If the guide turns, all stations rotate accordingly.

---

## 2. Steering & Speed Matching

The system uses three states for escort movement:

| State | Condition | Behavior |
| :--- | :--- | :--- |
| **Sprinting** | Distance to station > 2x tolerance. | Sets speed to **1.3x** the guide's speed (or 30% above current) to catch up. |
| **Closing** | Distance to station > tolerance. | Steers toward station bearing and matches guide speed. |
| **On Station** | Distance to station <= tolerance. | Matches guide heading and speed exactly. |

### Guide Loss
If the assigned `guideId` is no longer alive, the formation component is removed from the escort, allowing it to revert to manual waypoint navigation.

---

## 3. Data Access (World Buffer)

| Field | Access | Description |
| :--- | :--- | :--- |
| `hp` | Read | Checks if entity is alive. |
| `positionsX/Y` | Read | Current coordinates of both escort and guide. |
| `rotations` | Read | Current heading of the guide to calculate station rotation. |
| `speeds` | Read | Used to calculate sprint speeds. |
| `targetHeadings` | **Write** | Updated to point toward the station or match the guide. |
| `targetSpeeds` | **Write** | Updated to match or exceed guide speed for station keeping. |

---

## 4. Implementation Details

- **Tolerance**: The default `navToleranceMeters` is **200m**. Escorts will not make micro-adjustments if they are within this radius of their station.
- **Dirty Flags**: Sets `DirtyFlags.Kinematics` whenever heading or speed targets are modified.

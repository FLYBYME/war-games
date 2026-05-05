# MountSystem

The `MountSystem` manages the physical orientation of weapon mounts (turrets, launchers, gun banks). it handles the shortest-path rotation (slewing) toward targets and calculates complex aim points including predictive lead.

## Core Architecture

Every entity can have multiple mounts (up to 4 supported in the optimized buffer). The system ensures that each mount is physically aligned with its target before the `CombatSystem` permits firing.

### Priority & Update Cycle
- **Priority**: 55 (Executes before `CombatSystem`).
- **Target**: All alive entities with weapon mounts.

---

## 1. Targeting & Slewing

### Shortest-Path Slew
The system calculates the delta between the current `mountAzimuth` and the `mountTargetAzimuth`. It then rotates the mount at its `mountSlewRate` (deg/s) using the shortest angular path.

### Firing Arcs (`clampToArc`)
Mounts are often physically constrained (e.g., a turret that cannot fire through the ship's superstructure).
- **Center & Span**: Arcs are defined by a center bearing and a span (e.g., Center 0, Span 180 = Forward 180° arc).
- **Clamping**: If a target bearing is outside the arc, the mount target is clamped to the nearest edge of the arc.

---

## 2. Aim Point Calculation (`computeAimAzimuth`)

The system calculates where the mount should point to successfully engage a target:

### Predictive Lead
- **Logic**: If enabled, the system predicts the target's position based on its current velocity and the weapon's flight time (`Range / Projectile Speed`).
- **Lead Time**: Calculated iteratively to ensure accuracy at long ranges.

### Fire Control Error & CEP
The system factors in sensor and track quality:
- **Track CEP**: The "Circular Error Probable" of the target track (from `TrackManager`) is added to the mount's intrinsic `errorRadius`.
- **Note**: These errors do not move the mount randomly every tick; instead, they define the bias for the `CombatSystem` when it performs the final firing dice roll.

---

## 3. Data Access (World Buffer)

| Field | Access | Description |
| :--- | :--- | :--- |
| `hp` | Read | Checks if platform is alive. |
| `bbTrackIndices` | Read | Identifies the target track to follow. |
| `mountAzimuth` | **Read/Write** | The current physical orientation of the mount. |
| `mountTargetAzimuth`| **Read/Write** | The desired orientation (after lead/arcs). |
| `mountSlewRate` | Read | Maximum rotation speed of the turret. |
| `mountArcCenter/Span`| Read | Physical constraints on turret rotation. |
| `mountHasPredictiveLead`| Read | Flag to enable/disable lead calculation. |
| `mountMaxLeadTime` | Read | Limits how far ahead the mount will aim. |
| `mountBaseDispersion` | Read | Inherent mechanical inaccuracy. |
| `mountErrorRadius` | Read | Sensor-based pointing error. |

---

## 4. Implementation Details

- **Relative Bearings**: All mount azimuths are stored **relative** to the entity's current heading. To get the world bearing, you must add the entity's `rotation`.
- **Dirty Flags**: Sets `DirtyFlags.Combat` after updating mount states.

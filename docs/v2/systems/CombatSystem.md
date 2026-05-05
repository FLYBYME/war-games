# CombatSystem

The `CombatSystem` orchestrates target acquisition, fire control, and the deployment of munitions. It bridges the gap between sensor data (Tracks) and physical weapon systems (Mounts).

## Core Architecture

Unlike simpler systems, the `CombatSystem` decouples target assignment from actual firing. It relies on the `MountSystem` to handle the physical movement of turrets, while this system makes the decision to release weapons.

## Data Access (World Buffer)

The `CombatSystem` orchestrates many components via the `WorldBuffer`:

| Field | Access | Description |
| :--- | :--- | :--- |
| `bbTrackIndices` | **Read/Write** | Primary targeting handle. Linked to `TrackManager`. |
| `bbTargetIds` | **Read/Write** | Ground truth entity ID for targeting (legacy fallback). |
| `ammoCounts` | **Read/Write** | Decremented upon firing. Monitored for Winchester. |
| `weaponPostures` | Read | Checks for `FREE` posture for autonomous targeting. |
| `mountAzimuth` | Read | Current physical heading of the weapon mount. |
| `mountTargetAzimuth`| Read | Target heading calculated by the `MountSystem`. |
| `mountArcCenter/Span`| Read | Firing arc constraints for the specific mount. |
| `mountMin/MaxRange` | Read | Weapon engagement range constraints. |
| `lastFireTick` | **Read/Write** | Used with `reloadTicks` to enforce rate-of-fire. |
| `rotations` | Read | Platform heading used to calculate absolute weapon bearing. |

### Priority & Update Cycle
- **Priority**: 60 (Executes before `BehaviorSystem` and `CollisionSystem`).
- **Target**: All alive entities with weapons/mounts.

---

## 1. Targeting Logic

### Track-Based Resolution
The system does not "see" entities directly. It operates on **Tracks** provided by the `TrackManager`.
- **Legacy Fallback**: If a target ID is provided but no track exists, the system creates a "virtual track" to allow engagement.
- **Track Loss**: If a track is dropped (lost contact), the target is cleared and a `TargetLost` event is emitted.

### Autonomous Selection
If an entity's `WeaponPosture` is set to **FREE**, it will automatically search for the nearest hostile track if it doesn't already have a target assigned.

---

## 2. Fire Control & Readiness

For every mount on an entity, the system checks the following conditions before firing:

| Condition | Description |
| :--- | :--- |
| **Ammo** | Must have at least 1 round remaining in the specific mount stride. |
| **Range** | Target must be within `mountMinRange` and `mountMaxRange`. |
| **Reload** | Time since last fire must be greater than `reloadTicks`. |
| **Arc** | Target azimuth must be within the defined firing arc of the mount. |
| **Alignment** | The mount's current azimuth must be within `mountToleranceDeg` of the target bearing. |
| **WRA** | Weapons Release Authority: Checks if the target is already engaged by enough missiles (Salvo Size). |

---

## 3. Weapon Release (Firing)

### Missile Spawning
When all conditions are met, the system spawns a new entity (Category: `Weapon`).
- **Kinematic Lead**: For ballistic weapons, the system calculates an intercept point based on the target's current velocity and the projectile's muzzle speed.
- **Elevation**: Calculates the required vertical angle (parabolic trajectory) using gravity constant `G`.

### Fire Control Errors
- **Kinematic Dispersion**: Unguided weapons apply a "fuzziness" to their initial heading based on the mount's `fireControlErrorRadius`. This simulates mechanical inaccuracy.

### Winchester Status
When an entity's total ammunition across all mounts reaches zero, the system emits a `Winchester` event, signaling that the platform is out of ordnance.

---

## 4. Weapons Release Authority (WRA)

The system uses **Doctrines** to determine how many missiles to fire at a single target:
- **Default**: 2 missiles per target.
- **Customizable**: Doctrines can specify `salvoSize` based on target category (AIRCRAFT, SHIP, MISSILE) and weapon type.
- This prevents "overkill" and conserves ammunition by checking how many interceptors are already in flight against a specific track.

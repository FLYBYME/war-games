# GuidanceSystem

The `GuidanceSystem` implements Proportional Navigation (PN) steering for guided weapons (missiles). It is responsible for intercepting moving targets by calculating optimal pursuit curves.

## Core Architecture

The system uses a classic PN algorithm where the missile's turn rate is proportional to the rate of change of the line-of-sight (LOS) to the target.

### Priority & Update Cycle
- **Priority**: 15 (Executes before most other AI systems).
- **Target**: Entities in the `Weapon` category.

---

## 1. Guidance Logic

### Proportional Navigation (PN)
- **Algorithm**: `Turn Rate = N * (dLOS / dt)`
- **Gain (N)**: Fixed at **4.0** (standard tactical value).
- **LOS Snapshots**: The system maintains a history of the last 3 LOS snapshots to compute the rate of change accurately.

### Intercept Prediction (`computeTrackLOS`)
Instead of aiming at the target's current position, the system predicts an intercept point:
1. **Initial Estimate**: Time-to-impact (T) = Range / Missile Speed.
2. **Iterative Refinement**: Performs **3 iterations** of: `Future Position = Current Position + Velocity * T`.
3. This creates a "lead" aim point that accounts for target motion.

---

## 2. Operational States & Transitions

### Guidance Constraints
- **Fuel**: Guidance is disabled if `fuelKg <= 0`.
- **Speed**: Guidance is disabled if the missile falls below **50 kts**.
- **Range**: Maximum guidance range is **100km**.

### Engagement Drop & Retargeting
If the current track is lost or the target is no longer detected:
- **Inertial Fallback**: If configured, the missile flies straight on its last heading.
- **Retargeting**: If the `canRetarget` flag is set, the missile will search its local track buffer for the nearest alternate hostile target. If found, it switches guidance to the new track.

---

## 3. Data Access (World Buffer)

| Field | Access | Description |
| :--- | :--- | :--- |
| `entityCategories` | Read | Used to identify `Weapon` entities. |
| `bbTrackIndices` | **Read/Write** | Identifies the target track. Can be updated during retargeting. |
| `teamIds` | Read | Used for detection checks and retargeting filters. |
| `fuelKg` | Read | Guidance requires remaining fuel. |
| `speeds` | Read | Used for intercept time and G-limit turn rate calculations. |
| `positionsX/Y/Z` | Read | Current missile position. |
| `rotations` | Read | Current heading. |
| `velocitiesX/Y/Z` | Read | Used to calculate current elevation and 3D motion. |
| `targetHeadings` | **Write** | Updated based on PN commanded turn rate. |
| `velocitiesZ` | **Write** | Updated to adjust vertical flight path toward target. |

---

## 4. Implementation Details

- **G-Limits**: Command turn rates are constrained by the missile's physical G-limit (calculating max turn rate based on current speed).
- **Vertical Guidance**: Handles 3D intercepts by adjusting vertical velocity to match the predicted intercept elevation.

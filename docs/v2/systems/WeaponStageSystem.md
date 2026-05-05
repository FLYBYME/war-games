# WeaponStageSystem

The `WeaponStageSystem` manages complex, multi-stage flight profiles for advanced munitions. It handles transitions between boosters, sustainers, and terminal guidance stages, including physical separation and kinematic parameter updates.

## Core Architecture

Weapons with multiple stages (e.g., AAMs, SAMs, ABMs) have a `WeaponStageState` component. The system monitors the flight time of the weapon and advances the "active stage" based on pre-defined durations.

### Priority & Update Cycle
- **Priority**: 15 (Executes after `WaypointSystem` but before `KinematicsSystem`).
- **Target**: All alive entities in the `Weapon` category with multiple stages.

---

## 1. Stage Transitions

### Timing & Duration
Each stage has a `durationTicks`. When the time elapsed since the `stageStartTick` exceeds this duration, the system advances to the next stage.

### Kinematics Overrides (`applyStageKinematics`)
Each stage can specify its own physical characteristics. When a stage becomes active, the system updates the following fields on the entity:
- **Max Speed**: Updates `targetSpeeds`.
- **Thrust**: Updates `thrustN`.
- **Drag**: Updates `dragCoeff`.
- **Signature**: Updates `thermalSig` (e.g., a booster stage is much "hotter" than a sustainer).

### Stage Separation
When transitioning between stages:
- **Coast on Complete**: If a stage is marked to coast, the weapon transitions to `ballisticFlight` (engines off, gravity-driven) upon completion.
- **StageSeparation Event**: Emitted to trigger visual effects and telemetry.

---

## 2. Advanced: Kill Vehicles (KV)

For exoatmospheric or high-end interceptors (like GBI or SM-3):
1. **Final Stage Transition**: When the final booster stage ends, the system can be configured to spawn a "Kill Vehicle" (KV).
2. **Entity Swap**: A new `Weapon` entity is spawned at the current position, inheriting the booster's heading, speed, and target information.
3. **Cleanup**: The spent booster entity is destroyed (`hp = 0`), leaving only the agile KV to complete the intercept.

---

## 3. Data Access (World Buffer)

| Field | Access | Description |
| :--- | :--- | :--- |
| `hp` | **Read/Write** | Reads life status; Writes 0 to destroy spent boosters. |
| `entityCategories` | Read | Restricts logic to the `Weapon` category. |
| `rotations` | Read | Inherited by spawned Kill Vehicles. |
| `speeds`, `velocitiesZ` | Read | Inherited by spawned Kill Vehicles. |
| `targetSpeeds` | **Write** | Updated per stage kinematics. |
| `thrustN` | **Write** | Updated per stage kinematics. |
| `dragCoeff` | **Write** | Updated per stage kinematics. |
| `thermalSig` | **Write** | Updated per stage kinematics (signature management). |
| `ballisticFlight` | **Write** | Toggled if a stage is marked as "coast on complete." |
| `coastOnBurnout` | **Write** | Configures behavior for the end of the stage. |

---

## 4. Events

- **StageSeparation**: Emitted whenever a weapon advances to a new stage or spawns a Kill Vehicle.

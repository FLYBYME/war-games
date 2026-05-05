# TMSSystem

The `TMSSystem` (Track Management System) serves as the logical bridge between raw sensor detections and the persistent track database. It ensures that instantaneous "blips" from radars or sonars are correlated into stable, actionable tactical tracks.

## Core Architecture

The system processes a queue of detections gathered during the sensor phase. It relies on the `TrackManager` to perform the mathematical fusion and dead reckoning required to maintain a consistent tactical picture for each team.

### Priority & Update Cycle
- **Priority**: 52 (Executes after `SensorSystem` but before `MountSystem` and `CombatSystem`).
- **Target**: Global track databases for all teams.

---

## 1. Operational Phases

### Dead Reckoning (`tracks.update`)
Before processing new data, the system updates all existing tracks:
- **Prediction**: For tracks that have no current detection (ghost tracks), the system predicts their new perceived position based on their last known velocity and the time elapsed (`dt`).
- **Uncertainty**: As a track is dead-reckoned without new sensor data, its confidence decreases and its CEP (Circular Error Probable) radius increases.

### Correlation & Fusion (`tracks.correlate`)
The system flushes the `detectionQueue` populated by the `SensorSystem`:
- **Matching**: Each detection is compared against existing tracks. If it matches an existing track (based on position and velocity proximity), the track's state is updated.
- **New Tracks**: If a detection cannot be correlated with any existing track, a new track is initialized.
- **Team Isolation**: Tracks are managed per team; units only see tracks that have been correlated by their own team's sensors or shared via the `CommSystem`.

---

## 2. Data Access (World Buffer)

The `TMSSystem` primarily reads metadata from the `WorldBuffer` to route detections to the correct team-specific track pools.

| Field | Access | Description |
| :--- | :--- | :--- |
| `teamIds` | Read | Used to identify which team's track database the detection should be merged into. |

*Note: The bulk of the data manipulation happens within the `TrackManager`'s internal buffers, which store the perceived positions, velocities, and classifications of all tactical tracks.*

---

## 3. Interaction Flow

1. **SensorSystem**: Detects an entity and calls `tms.queueDetection(RawDetection)`.
2. **TMSSystem**: 
    - Updates existing tracks via dead reckoning.
    - Iterates through the queue and calls `tracks.correlate`.
3. **CombatSystem / MountSystem**: Query the `TrackManager` to get target positions for fire control and slewing.

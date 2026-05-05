# TrackManager & Buffer

The `TrackManager` and its associated `LocalTrackBuffer` manage the **Tactical Picture** for every unit in the simulation. Unlike the "Ground Truth" stored in the `WorldBuffer`, tracks represent the *perceived* state of the world.

## Core Architecture

Each entity has its own isolated tactical database. This simulates the fog of war: different ships might see the same target at slightly different positions or with different levels of classification.

### Capacity
- **Entities**: 2048 supported platforms.
- **Tracks per Entity**: Each platform can maintain up to 32 simultaneous tracks.

---

## 1. Track Lifecycle

### Correlation (`correlate`)
When a sensor produces a detection, the manager attempts to match it to an existing track:
1.  **Hard Matching**: Checks if a track already exists for the `trueEntityId`.
2.  **Gating**: If no ID match exists, it uses spatial gating. If a detection is within the track's **CEP (Circular Error Probable)** plus a margin, it is fused into that track.
3.  **New Track**: If no match is found, a new track is initialized.

### Dead Reckoning (`update`)
Between sensor updates, the manager "propagate" tracks:
1.  **Position Update**: Perceived positions are updated using the track's last known velocity.
2.  **Uncertainty Expansion**: The `cepRadiusMeters` increases over time. The longer a track is without a fresh detection, the more "blurry" its position becomes.
3.  **Coasting & Dropping**: If a track is not updated for several seconds, it transitions to `COASTING`. If the uncertainty becomes too high (e.g., > 50km), the track is `DROPPED`.

---

## 2. Track Merging

The manager periodically evaluates all tracks in a platform's database. If two tracks are found to represent the same target (based on ground truth or extreme proximity), they are merged into a single track to reduce clutter.

---

## 3. Data Access (LocalTrackBuffer)

| Field | Description |
| :--- | :--- |
| `positionsX/Y/Z` | The *perceived* 3D position of the target. |
| `velocitiesX/Y/Z`| The *perceived* motion vector of the target. |
| `cepRadiusMeters` | The current radius of uncertainty (Circular Error Probable). |
| `status` | Active, Coasting, or Dropped. |
| `classifications` | Unknown, Friendly, Hostile, Neutral. |
| `engagementCount` | Tracks how many interceptors (missiles) are currently assigned to this track. |

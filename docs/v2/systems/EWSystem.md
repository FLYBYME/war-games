# EWSystem

The `EWSystem` (Electronic Warfare System) handles Electronic Attack (EA) and Electronic Support (ES). It manages the spectral noise environment, jamming propagation, and the triangulation of enemy emitters through ESM cross-fixing.

## Core Architecture

The system models electromagnetic interactions across multiple spectrum bands: **L, S, C, X, and KU**. It operates by computing noise floors for every entity based on active jamming in the environment.

### Priority & Update Cycle
- **Priority**: 18 (Executes before sensors and TMS).
- **Target**: All alive entities.

---

## 1. Electronic Attack (Jamming)

### Noise Floor Calculation
Every tick, the system resets all spectral noise floors to the environment's `ambientNoise`. It then iterates through all `activeJammers` and applies noise to victims based on:
- **Burn-Through**: Calculates 1/R^2 path loss for jamming noise.
- **Band Specificity**: Jamming noise is applied only to the bands the jammer is currently targeting.
- **Range Limit**: Effective jamming range is capped at **250km**.

### Jamming Strobe
If the received jamming noise is above a certain threshold (-100 dBw), the system:
- Updates `ewJammingReceivedKw` (weighting of total jamming).
- Calculates the bearing to the source and sets `ewJammingSourceAzimuth`.
- Periodically emits a `JammingStrobe` event to simulate a "strobe" on the operator's display.

---

## 2. Electronic Support Measures (ESM)

### Cross-Fixing & Triangulation
The system intercepts signals from `activeEmitters` (radars) and attempts to locate them:
1. **Bearing Lines**: Every unit with active ESM sensors records a bearing to detected emitters within **150km**.
2. **Intersection**: If two or more units record bearing lines to the same emitter, the system calculates the intersection point (triangulation).
3. **TMS Integration**: The triangulated position is queued as a `RawDetection` to the TMS (Track Management System), allowing units to track radars without using their own active sensors.

---

## 3. Data Access (World Buffer)

| Field | Access | Description |
| :--- | :--- | :--- |
| `ambientNoise` | Read | The baseline noise floor for the entity's current location. |
| `ewEmissionState` | Read | Identifies if entity is a Radar (1) or Jammer (2). |
| `jammerPowerKw` | Read | Transmit power used to calculate jamming noise. |
| `ewSpectralFloor[L..KU]`| **Write** | The modified noise floor per band after jamming. |
| `ewJammingReceivedKw` | **Write** | Total power of jamming being received. |
| `ewJammingSourceAzimuth`| **Write** | Bearing to the primary jamming source. |
| `positionsX/Y/Z` | Read | Used for distance and triangulation calculations. |
| `rcsFrontal` | Read | Signature data shared with TMS during triangulation. |

---

## 4. Events

- **JammingStrobe**: Emitted when a unit is being actively jammed, providing the bearing to the source.
- **SpikeSearch**: Periodic event emitted when a unit's RWR (Radar Warning Receiver) detects an active radar search.

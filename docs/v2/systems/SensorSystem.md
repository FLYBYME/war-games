# SensorSystem

The `SensorSystem` is the "eyes and ears" of the simulation. It handles the detection of entities using Radar, Sonar, Visual, and ESM (Electronic Support Measures). It translates physical signatures and environmental conditions into tactical "Detections."

## Core Architecture

The system uses a physics-based approach to detection, calculating signal strengths and probabilities rather than simple radius checks.

### Priority & Update Cycle
- **Priority**: 50 (Executes after positions have been updated by Kinematics).
- **Target**: All alive entities with a sensor suite.

---

## 1. Detection Modalities

### Radar (Active)
Calculates Probability of Detection (`Pd`) based on:
- **SNR (Signal-to-Noise Ratio)**: Uses the Radar Equation factoring in Transmit Power, Range (1/R⁴), and Receiver Sensitivity.
- **RCS (Radar Cross Section)**: Aspect-dependent (Frontal, Side, Rear).
- **Jamming**: Increases the effective noise floor, reducing SNR.
- **Sweep**: Rotating radars only detect targets within their current `beamWidthDeg`.

### Sonar (Active/Passive)
- **Signal Excess (SE)**: Calculated as `Signature - Path Loss - Noise Floor + Gain`.
- **Towed Arrays**: Provide a noise reduction bonus based on their `deployedPct`.
- **Cavitation**: If the target is moving too fast for its depth, its signature increases significantly.

### Visual / Optical
- Simple probability based on range and `radarAttenuation` (simulating weather/fog).
- Probability decreases linearly until the `maxRangeM` of the visual sensor.

### ESM (Passive)
- Detects enemy units that are using active radar.
- Has a 1/R² propagation advantage over active radar (can see them before they see you).

---

## 2. TMS Integration

When a sensor successfully detects a target:
1. **Raw Signal**: A `RawDetection` signal is created containing the target's perceived position, velocity, and signature.
2. **TMS Queue**: This signal is passed to the `TMSSystem` (Track Management System), which correlates the detection into persistent **Tracks**.

---

## 3. Data Access (World Buffer)

| Field | Access | Description |
| :--- | :--- | :--- |
| `emconMode` | Read | Radar requires `ACTIVE` mode to transmit. |
| `currentAzimuth` | **Read/Write** | The current rotation angle of the radar sweep. |
| `sweepRateHz` | Read | Rotation speed of the radar. |
| `beamWidthDeg` | Read | The "width" of the radar beam. |
| `ambientNoise` | Read | Baseline noise for SNR calculations. |
| `txPowerKw` | Read | Radar transmit power. |
| `rxSensitivityDbm`| Read | Minimum signal required for detection. |
| `radarAttenuation`| Read | Environmental factor (weather) affecting all sensors. |
| `rcsFrontal/Side/Rear`| Read | Aspect-dependent signatures of the target. |
| `acousticSig` | Read | Target's noise signature for sonar. |
| `ewSpectralFloor[L..KU]`| Read | Noise floor increased by active jamming. |

---

## 4. Track Management

- **NewContact**: Emitted when a team first detects an entity.
- **ContactLost**: Emitted if a target has not been detected by any team member for more than **5 seconds**.
- **DiceRoll**: Telemetry event that logs the SNR and probability of every radar detection attempt.

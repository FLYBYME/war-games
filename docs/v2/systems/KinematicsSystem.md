# KinematicsSystem

The `KinematicsSystem` is the core Newtonian physics engine of the simulation. It handles movement, acceleration, drag, fuel consumption, and environmental effects like cavitation and thermal layers.

## Core Architecture

The system supports two distinct flight modes:
1. **Powered**: Aircraft, ships, and guided missiles using thrust and steering.
2. **Ballistic**: Shells and unguided projectiles following a gravity-driven arc.

### Priority & Update Cycle
- **Priority**: 10 (Executes early to ensure positions are settled before other systems run).
- **Target**: All alive entities.

---

## 1. Powered Flight Physics

### Steering & G-Limits
Units rotate toward their `targetHeading`. The turn rate is the **most restrictive** of:
- **G-Limit**: `(Physics.DEFAULT_G_LIMIT * G) / Speed`. This ensures realistic turn circles (faster units turn wider).
- **Profile Limit**: `maxTurnRateDeg` defined in the entity profile.

### Acceleration & Speed
- **Force Balance**: Net Force = `(Thrust * Modifier) - Drag`.
- **Drag**: `0.5 * rho * v² * DragCoeff`.
- **Density (rho)**: Uses an exponential atmospheric model for air (`RHO_AIR * exp(-alt / 8500)`) and constant density for water.

### Vertical Movement
- Units climb or descend toward `targetAltitudeM` at a constant climb rate.
- **Conservation of Velocity**: As a unit climbs, its horizontal speed component is reduced to maintain the total speed magnitude.

---

## 2. Ballistic Flight

Ballistic entities ignore thrust and steering. They are subject to:
- **Gravity**: Constant downward acceleration (`9.81 m/s²`).
- **Drag**: Applied to the entire velocity vector, simulating terminal velocity.

---

## 3. Subsurface & Fuel Logic

### Cavitation (Submarines/Ships)
Calculates the critical cavitation speed based on depth and ambient pressure.
- **Trigger**: If `Speed > vCrit`, cavitation starts.
- **Effect**: Increases `acousticSig` by +20 dB, making the unit much easier to detect by sonar.

### Thermal Layer
Monitors the depth of the thermal layer. Crossing this boundary emits a `ThermalLayerCrossed` event, which is used by sensors to determine acoustic propagation paths.

### Fuel Management
- **Burn Rate**: Fuel is consumed based on the unit's `burnRate` and current speed.
- **Joker Fuel**: Emits an event when fuel falls below **20%** of max capacity.
- **Burnout**: When fuel reaches 0, units either stop (ships) or transition to `ballisticFlight` (missiles/aircraft) if `coastOnBurnout` is enabled.

---

## 4. Data Access (World Buffer)

| Field | Access | Description |
| :--- | :--- | :--- |
| `positionsX/Y/Z` | **Read/Write** | Core spatial state. |
| `velocitiesX/Y/Z` | **Read/Write** | Stateful 3D motion vectors. |
| `rotations` | **Read/Write** | Current horizontal heading (yaw). |
| `speeds` | **Read/Write** | Scalar magnitude of the velocity vector. |
| `fuelKg` | **Read/Write** | Consumed every tick; monitored for Joker/Burnout. |
| `ballisticFlight` | **Read/Write** | Flag that toggles between physics modes. |
| `isCavitating` | **Write** | Boolean flag for acoustic signature penalty. |
| `thrustN` | Read | Base engine power. |
| `dragCoeff` | Read | Aerodynamic/Hydrodynamic resistance factor. |
| `massKg` | Read | Used for F=ma calculations. |

---

## 5. Events

- **CavitationStarted/Stopped**: Alerts when a unit exceeds its quiet speed depth.
- **ThermalLayerCrossed**: Critical for ASW (Anti-Submarine Warfare) tactics.
- **JokerFuel**: Alert for low fuel state.

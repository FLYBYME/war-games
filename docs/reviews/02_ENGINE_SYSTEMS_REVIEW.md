# Deep Codebase Review: Engine Systems & Components
**Date:** May 2026
**Target:** `src/engine/systems/`, `src/engine/components/`

---\n\n## 1. ECS Catalog\n\n### 1.1 ECS Systems (`src/engine/systems/`)
The engine utilizes a phased execution model. Systems are categorized by their `SystemPhase` (Perception, Logic, Forces, Physics, Lifecycle).

| System Name | Phase | Key Responsibility |
| :--- | :--- | :--- |
| **AeroSystem** | Forces | Calculates aerodynamic lift, drag, and moments based on air density and velocity. |
| **BoardingSystem** | Logic | Manages ship-to-ship boarding actions and crew transfers. |
| **CollisionSystem** | Physics | Detects intersections between entities and triggers damage/detonation. |
| **CombatSystem** | Lifecycle | Calculates fire control solutions and slews weapon mounts. |
| **CommissarSystem** | Logic | Enforces doctrine and morale constraints on units. |
| **ConditionSystem** | Lifecycle | Manages temporary status effects and debuffs on entities. |
| **ControlSystem** | Forces | Converts navigation commands (Heading/Speed) into physical forces (Thrust/Torque). |
| **DamageDegradationSystem** | Lifecycle | Reduces subsystem efficiency based on health state. |
| **DatalinkSystem** | Perception | Synchronizes tracks between friendly units within comms range. |
| **DoctrineSystem** | Logic | Evaluates Rules of Engagement (ROE) and Weapon Release Authority (WRA). |
| **EnvironmentSystem** | Perception | Updates local weather, sea state, and lighting conditions. |
| **FormationSystem** | Logic | Calculates offset positions for wingmen and escorts. |
| **GuidanceSystem** | Forces | Implements missile homing laws (Proportional Navigation, Pursuit). |
| **HealthSystem** | Lifecycle | Processes damage accumulation and entity destruction. |
| **LogisticsSystem** | Logic | Manages fuel consumption and ammunition stockpiles. |
| **MineTriggerSystem** | Physics | Evaluates proximity and magnetic triggers for naval/land mines. |
| **MissileHomingSystem** | Forces | Specialized guidance for high-maneuverability munitions. |
| **MissionSystem** | Logic | Orchestrates high-level task graphs and mission objectives. |
| **MovementSystem** | Physics | Integrates velocity to update 3D positions (Pure Kinematics). |
| **OrbitalPhysicsSystem** | Physics | Calculates Keplerian orbits and atmospheric reentry. |
| **PhysicsSystem** | Physics | Primary force integrator and collision resolver. |
| **PropulsionSystem** | Forces | Models engine thrust curves based on throttle and altitude. |
| **ScenarioAutomationSystem**| Logic | Executes scripted events and triggers within a scenario. |
| **SensorSystem** | Perception | Models Radar, Sonar, ESM, and IR detections with high fidelity. |
| **TaskReconcilerSystem** | Logic | Syncs AI task states with physical entity capabilities. |
| **TelemetrySystem** | Lifecycle | Exports simulation state for external monitoring and replay. |
| **ThreatMapSystem** | Perception | Generates tactical heatmaps based on known hostile locations. |
| **TMSSystem** | Perception | Lightweight track management (V3 implementation). |
| **TrackManagementSystem** | Perception | Complex track fusion, ESM triangulation, and jamming resolution (V2 implementation). |
| **ViewStateSystem** | Lifecycle | Generates filtered state snapshots for UI and AI agents. |
| **WaypointSystem** | Forces | Handles geographic navigation, loitering, and TOT (Time On Target). |
| **WeaponStageSystem** | Lifecycle | Manages multi-stage munitions (e.g., booster separation). |
| **WRAExecutorSystem** | Logic | Automated weapon firing logic based on doctrine rules. |

### 1.2 ECS Components (`src/engine/components/`)
Components are pure data structures used by systems.

| Component | Properties |
| :--- | :--- |
| **Aero** | Surface area, drag coefficients, lift slopes, stall angles. |
| **Ballistics** | Muzzle velocity, mass, caliber, ballistic coefficient. |
| **Boarding** | Boarding party size, capture progress, defensive strength. |
| **Collision** | Bounding volume, collision mask, elasticity. |
| **Combat** | Mounts, magazines, current target, fire control status. |
| **Datalink** | Network ID, encryption key, transmit/receive status. |
| **Doctrine** | ROE state, WRA rules, EMCON status. |
| **ElectronicWarfare** | Jammers (SPJ/SOJ), power, frequency bands, modes. |
| **Environment** | Local temperature, pressure, wind, visibility. |
| **Group** | Unit formation, parent group ID, role. |
| **Guidance** | Seekers, guidance law, illuminator ID, lock status. |
| **Health** | Structure HP, subsystem health (Combat, Sensors, Propulsion). |
| **Logistics** | Fuel capacity, burn rate, resource stockpiles. |
| **Missions** | Task graph, active mission, objective status. |
| **Navigation** | Waypoints, desired heading/speed/altitude, loiter parameters. |
| **Orbital** | Elements (semi-major axis, eccentricity), epoch. |
| **Physics** | Position, velocity, acceleration, mass, rotation, inertia. |
| **Propulsion** | Engine type, max thrust, throttle, specific impulse. |
| **Sensors** | Sensor list (Radar, Sonar, etc.), scan state, sensitivity. |
| **Signatures** | RCS, IR signature, Acoustic SL, Visual contrast. |
| **Subsurface** | Buoyancy, crush depth, battery level (subs). |
| **TaskGraph** | Node list, active nodes, execution history. |
| **Telemetry** | Subscription level, update frequency. |
| **Track** | Tactical track list, fused track state. |
| **WeaponStages** | Stage definitions, separation triggers. |

---\n\n## 2. Technical Conflict: TMSSystem vs TrackManagementSystem

There is a significant architectural split between `TMSSystem.ts` and `TrackManagementSystem.ts`.

### 2.1 Implementation Differences
*   **TMSSystem (V3):**
    *   **Pattern:** Follows the strict **Command Pattern**. It returns `CreateTrackCommand`, `UpdateTrackCommand`, and `DropTrackCommand`.
    *   **Logic:** Simpler, focusing on \"truth-based\" correlation and basic dead reckoning.
    *   **Standard Compliance:** High. Uses the world's command resolution loop.
*   **TrackManagementSystem (V2):**
    *   **Pattern:** **Direct Mutation**. It modifies `trackComp.tracks` inside its `process` loop.
    *   **Logic:** Much more advanced. Includes ESM triangulation, velocity estimation from position history, jamming penalties (CEP expansion), and hostile act detection (e.g., firing a weapon makes a track hostile).
    *   **Standard Compliance:** Low. Bypasses `Command` system for many operations, leading to potential sync issues with `Tracer` and `ViewStateSystem`.

### 2.2 Recommendation
The systems are currently redundant. `TrackManagementSystem` contains critical tactical logic (ESM/Triangulation) that `TMSSystem` lacks, but `TMSSystem` has the correct architectural structure.
**Action:** Merge the advanced logic from `TrackManagementSystem` into the `Command`-based structure of `TMSSystem` and deprecate the former.\n\n---\n\n## 3. Logic Review: Navigation, Combat, and Sensors\n\n### 3.1 WaypointSystem (Navigation)
*   **Completeness:** High. Successfully handles Loiter, 3D waypoint steering, and Time-On-Target (TOT) velocity adjustments.
*   **Logic Gap:** Lacks \"Collision Avoidance\" (delegated to `CollisionSystem`, but `WaypointSystem` should ideally account for it in steering).
*   **Standards Violation:** Mutates `nav.activeWaypointIndex` and `nav.navState` directly instead of using commands.

### 3.2 CombatSystem
*   **Completeness:** Moderate. Calculates complex ballistic solutions using `FireControl` and handles weapon mount slewing.
*   **Logic Gap:** The slewing logic is buried inside a helper function that mutates the `Mount` object directly. It should return an `UpdateMountSlewCommand`.
*   **Standards Violation:** Excessive use of `as unknown as WeaponProfile` and `as DoctrineComponent`.

### 3.3 SensorSystem
*   **Completeness:** Very High. Features high-fidelity modeling of SNR, Radar Horizon, Doppler Notch, Sea State Clutter, and Atmospheric Attenuation.
*   **Logic Gap:** The `losCache` is cleared every frame, which is safe but expensive for large scenarios.
*   **Standards Violation:** Uses `this.losCache.get(key)!` (non-null assertion).\n\n---\n\n## 4. Audit: Event Emissions & State Changes\n\nThe engine's state-changing logic is inconsistent in its event emission.\n\n*   **Silent Mutations:** `MovementSystem`, `WaypointSystem`, and `PropulsionSystem` update core physical properties (Position, Heading, Speed) via commands. However, the handlers for these commands (`SetPositionHandler`, etc.) **only emit events if the command is marked as `isExternal`**.
    *   *Result:* Internal simulation steps are \"dark\" to the `EventBus` unless explicitly queried via `World.toJSON()`. This is an intentional optimization for performance but makes reactive UI updates difficult without polling.
*   **Missing Emissions:**
    *   `UpdateTrackHandler`: Does not emit an event when a track is updated (only creation/drop).
    *   `SyncESMBearingsHandler`: Updates sensor state silently.
    *   `CombatSystem`: Mount slewing happens silently every frame.\n\n---\n\n## 5. Engineering Standards Audit (GEMINI.md)\n\n### 5.1 The `any` Ban
While `grep` showed few naked `any` usages in components, several critical systems utilize them:
*   `TelemetrySystem.ts`: Uses `any` for raw data payloads and event casting (`const e = event as any`).
*   `ViewStateSystem.ts`: Uses `any` for weather parameters.
*   **Violation:** These should be typed as `unknown` and validated or use a strict union.

### 5.2 Type Assertions (`as`)
This is the most frequent violation.
*   **Forced Casts:**
    *   `world.profileRegistry as ProfileRegistry` (Used in almost every system).
    *   `entity.getComponent(...) as XComponent` (Used instead of proper null-checking or type predicates).
    *   `mission.params as StrikeParams` (Unsafe casting of JSON payloads).
*   **Structural Risks:** These casts bypass the compiler's ability to detect if a component is missing or if the registry type has changed.

### 5.3 Non-Null Assertions (`!`)
*   `SensorSystem.ts`: `this.losCache.get(key)!`
*   `World.ts`: Occasional use in internal registry lookups.
*   **Violation:** Fails to handle the case where a cache entry might have been pruned or a registry lookup fails.\n\n---\n\n## 6. Actionable Findings & Summary\n\n1.  **Refactor Track Management:** Consolidate `TrackManagementSystem` logic into `TMSSystem` using a pure Command-based approach.
2.  **Formalize Registry Access:** Replace `world.profileRegistry as ProfileRegistry` with a typed getter on the `World` or `IWorldView` interface to eliminate casting.
3.  **Commandify Navigation:** Refactor `WaypointSystem` to use `UpdateNavigationStateCommand` instead of direct component mutation.
4.  **Standardize Combat Slewing:** Move mount slew logic into a Command/Handler pattern to allow the UI to smoothly interpolate mount movement.
5.  **Telemetry Events:** Consider a \"High Frequency\" vs \"Event Driven\" split for `TelemetryUpdated`. Currently, the `isExternal` check prevents the UI from seeing autonomous unit movement via the EventBus.

**Conclusion:** The engine logic is technically sophisticated and robust, particularly in the physics and sensor domains. However, the implementation has \"architecture rot\" in its track management and frequently bypasses TypeScript's safety features to reduce boilerplate, violating the core mandates of `GEMINI.md`.

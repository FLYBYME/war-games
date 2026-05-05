Here is the breakdown of what remains on the backend:

1. Weapon & Munition Profiles
While we have a CombatSystem, we are currently missing a WeaponProfileRegistry. We need a formal system to define characteristics like:

Aerodynamic Range Envelopes: Max range vs. altitude and target speed.
Probability of Kill (Pk) Tables: Lethality against different target types.
Engagement Logic: Guidance type (Active/Semi-Active/IR) and mid-course update requirements.
2. Telemetry & Event Logging
The UIUX.md spec requires a color-coded Message Log and Analytical Graphing. We need a backend EventSystem that captures:

Sim Milestones: Missile launches, stage separations, impact events, and detection state changes.
Historical Data: A buffer of kinematic data for selected units to allow the frontend to draw real-time graphs (e.g., Altitude vs. Speed over the last 300 ticks).
3. Electronic Warfare (EW) Refinement
We have a basic EMCON and jamming implementation, but professional simulation requires Stand-off Jamming (SOJ) and Self-Protection Jamming (SPJ) logic that actively modifies the Signal-to-Noise ratio of specific radars based on the jammer's power and distance.

4. Environmental Dynamics (Weather)
The EnvironmentSystem exists but needs to be integrated more deeply:

Sea State: Impacting both RCS (clutter) and Sonar performance (ambient noise).
Wind/Atmospherics: Affecting aircraft fuel consumption and weapon flight paths.
Thermal Layers: Expanding the sonar model to support more complex sound-speed profiles.
5. Datalink & COP Fusion
Our current DatalinkSystem is instantaneous. To achieve "Pro" standards, we need to model:

Network Latency: Delay between a sensor detecting a target and the track appearing on a remote unit's screen.
Fusion Logic: More robust deduplication in the TrackManagementSystem to prevent "ghost tracks" when multiple units detect the same target.
6. Simulation Persistence & Scenario API
We need a robust API (likely via the existing MatchService) that allows the frontend to:

Pause/Resume/Save: Persist the entire ECS world state to a JSON/Binary file.
Dynamic Spawning: A "Scenario Editor" API to place units, set side relations, and define initial waypoints in real-time.
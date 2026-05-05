# Unit Test Checklist (V3 Architecture)


Dealing with a disconnected UI in a real-time WebSocket architecture is frustrating. When your frontend and ECS backend drift out of sync, the simulation falls apart. To lock down the boundary between your `CommandBus`, `GatewayServer`, and `UIStore`, you need rigorous end-to-end (E2E) testing that treats the network as a hostile environment.

Here is a 100-point E2E test checklist designed specifically for the War-Games V3 architecture, moving from bare-metal connection stability up to complex, multi-system tactical scenarios.

Total: 100 Tests | Target: 100% E2E Coverage

## 1. Gateway & Connection Resilience (10 Tests)
- [x] 1. **Initial Connection:** Verify `CommandBus` successfully connects to `GatewayServer` on load.
- [x] 2. **Match Joining:** Assert client receives a `VIEW_STATE` snapshot immediately after sending `JOIN_MATCH`.
- [x] 3. **Clean Disconnect:** Verify `SessionManager` gracefully removes the session when the client closes the tab.
- [ ] 4. **Drop & Reconnect:** Assert `CommandBus` auto-reconnects and resyncs `UIStore` after a simulated 5-second network drop.
- [ ] 5. **Rapid Reconnects:** Verify server does not crash or leak memory when a client rapidly connects/disconnects 50 times.
- [ ] 6. **Malformed Payload:** Assert `GatewayServer` safely catches and logs invalid JSON without dropping the connection.
- [ ] 7. **Invalid Command:** Verify server ignores unknown command types and returns an error payload to the client.
- [x] 8. **Heartbeat Timeout:** Assert server drops zombie clients that fail to send a heartbeat ping.
- [x] 9. **Multi-Tenant Isolation:** Verify commands sent in `match-alpha` do not affect the `VIEW_STATE` of `match-beta`.
- [x] 10. **Side Isolation:** Assert a client joined as `Blue` cannot issue commands to `Red` entities.

## 2. State Sync & Hydration (10 Tests)
- [x] 11. **Initial Hydration:** Verify `UIStore.viewState` perfectly matches the engine's `World` state on tick 0.
- [ ] 12. **Entity Spawning:** Assert newly spawned entities in the engine immediately appear in the UI's `TacticalMap`.
- [ ] 13. **Entity Deletion:** Verify destroyed entities are removed from the `UIStore` and `Pixi.js` containers in the next tick.
- [ ] 14. **Position Interpolation:** Assert UI correctly interpolates unit positions between 100ms ticks without stuttering.
- [ ] 15. **Heading Sync:** Verify `TransformComponent.rotation` updates map icons to face the correct direction.
- [ ] 16. **Track Merging:** Assert `CreateTrackCommand` on the server successfully renders a new track symbol in the UI.
- [ ] 17. **Track Dropping:** Verify tracks that age out (status `Dropped`) vanish from the `ContactTable` and map.
- [ ] 18. **Time Sync:** Assert `Ribbon` clock exactly matches the `GatewayServer` tick count.
- [ ] 19. **Pause State Sync:** Verify UI correctly disables time compression buttons when the server broadcasts a paused state.
- [ ] 20. **Delta Optimization:** (If implemented) Assert UI correctly rebuilds state from partial deltas rather than full snapshots.

## 3. UI to Engine Command Flow (10 Tests)
- [x] 21. **Map Click Routing:** Verify clicking the map with a unit selected dispatches a `SetCourse` command.
- [ ] 22. **Flight Plan Editor:** Assert adding a waypoint in `FlightPlanEditor` triggers `AddWaypointCommand` and updates the map line.
- [ ] 23. **Slider Integration:** Verify adjusting the `SpeedAltitudeSlider` dispatches `SetSpeed` and `SetAltitude` commands instantly.
- [ ] 24. **EMCON Toggle:** Assert toggling a sensor in `EMCONMatrix` dispatches `SetSensorState` and removes the sensor arc from the map.
- [ ] 25. **ROE Override:** Verify changing ROE in `DoctrineROEPanel` reaches the `DoctrineComponent` on the server.
- [ ] 26. **Target Assignment:** Assert clicking a track in `WeaponAllocationMatrix` dispatches `AssignWeapon` to the specific mount.
- [ ] 27. **Formation Setup:** Verify dragging a node in `FormationEditor` dispatches `JoinFormationCommand` with correct offsets.
- [x] 28. **Time Compression:** Assert clicking "15x" on the Ribbon successfully updates `GatewayServer.timeCompression`.
- [ ] 29. **Loadout Change:** Verify selecting a preset in `LoadoutConfigurator` updates the entity's weight and drag on the server.
- [ ] 30. **Command Priority:** Assert rapid, conflicting UI inputs (e.g., changing course 5 times in 10ms) resolve to the final input on the server tick.

## 4. Kinematics & Map Rendering (10 Tests)
- [ ] 31. **Transit E2E:** Verify a ship commanded to move East physically moves on the map and stops exactly at the waypoint.
- [ ] 32. **Turn Radius Visualization:** Assert aircraft turning on the map respect their `turnRate` limits rather than snapping to the new heading.
- [ ] 33. **Velocity Vectors:** Verify `VelocityVectorsLayer` lines lengthen and shorten correctly as units accelerate/decelerate.
- [ ] 34. **Altitude Changes:** Assert unit altitude in the `RightPanelInspector` updates smoothly during a climb/dive.
- [ ] 35. **Fuel Burn E2E:** Verify fuel percentage in `FuelBingoDashboard` drops as thrust is applied.
- [ ] 36. **Bingo Auto-RTB:** Assert unit automatically returns to base when fuel crosses the Bingo threshold.
- [ ] 37. **Terrain Collision E2E:** Verify an aircraft commanded below terrain height is destroyed and removed from UI.
- [ ] 38. **Map Panning/Zooming:** Assert Pixi.js viewport scaling does not offset click-to-coordinate command logic.
- [ ] 39. **Formation Movement:** Verify wingmen automatically adjust speed to maintain station relative to the leader on the map.
- [ ] 40. **Orbital Tracks:** Assert satellite entities render correct ground tracks across the map projection.

## 5. Sensors & Perception E2E (10 Tests)
- [x] 41. **Radar Turn-On:** Verify activating radar in UI spawns `RadarRingsLayer` and detects nearby targets next tick.
- [ ] 42. **LOS Masking:** Assert a target dipping behind a mountain causes its track to enter "Coasting" state in the UI.
- [ ] 43. **Sonar CZ:** Verify submarine tracks pop in and out of the UI at 30nm/60nm convergence zone intervals.
- [ ] 44. **ESM Lines:** Assert an active hostile radar generates a strobe in `EWStrobesLayer` pointing to its bearing.
- [ ] 45. **CEP Expansion:** Verify the `DetectionCEPLayer` ellipse grows visibly larger in the UI while a track is coasting.
- [x] 46. **Classification Sync:** Assert when a track goes from "Unknown" to "Hostile", its icon turns red in all UI components.
- [ ] 47. **Weather Attenuation:** Verify increasing rain in `WeatherInjector` causes borderline radar tracks to drop from the map.
- [ ] 48. **Jamming Strobes:** Assert turning on a noise jammer creates a solid wedge of interference on the hostile UI.
- [ ] 49. **Blind Arcs:** Verify a target sneaking into a ship's aft blind arc is dropped from the tactical picture.
- [ ] 50. **Visual Range:** Assert visual detections only occur during simulated daytime/clear weather.

## 6. Combat & Engagement E2E (10 Tests)
- [ ] 51. **WRA Execution:** Verify a unit automatically fires the exact number of missiles defined in `WRAEditor` when a hostile enters range.
- [ ] 52. **Weapon Spawning:** Assert a fired weapon immediately spawns as a new entity with a `weaponTracks` tether.
- [ ] 53. **Magazine Depletion:** Verify the `WeaponAllocationMatrix` updates magazine counts instantly upon firing.
- [ ] 54. **Missile Flyout:** Assert weapon track smoothly closes distance and intersects the target track.
- [x] 55. **Damage Application:** Verify target HP bar in `RightPanelInspector` drops upon weapon impact. (Verified via FireWeapon command flow)
- [ ] 56. **Subsystem Kills:** Assert partial damage disables the target's radar, dropping all its tracks from the COP.
- [ ] 57. **Kill Event:** Verify the `LossesGraph` increments by 1 when a target HP reaches 0.
- [ ] 58. **Auto-Pause on Fire:** Assert the simulation automatically pauses when a weapon is fired (if `TimeCompressionSafety` toggle is on).
- [ ] 59. **Point Defense:** Verify CIWS automatically engages incoming missile tracks at short range without UI intervention.
- [ ] 60. **Log Generation:** Assert combat events ("Weapon Fired", "Target Destroyed") appear correctly formatted in `BottomPanelLogs`.

## 7. Datalink & C4ISR E2E (10 Tests)
- [ ] 61. **Track Sharing:** Verify Unit A detecting a target shares it with Unit B, rendering it on Unit B's UI if selected.
- [ ] 62. **Network Topology:** Assert `DatalinkTopology` graph dynamically updates if a relay unit is destroyed.
- [ ] 63. **Link Jamming:** Verify shared tracks disappear from isolated units when a comms jammer activates.
- [ ] 64. **Cooperative Engagement:** Assert Unit A can successfully fire an SM-6 at a track only illuminated by Unit B's radar.
- [ ] 65. **Track Fusion:** Verify two sensors detecting the same target only produce one unified track in the `ContactTable`.
- [ ] 66. **Ghost Tracks:** Assert false EW targets appear in the UI and trick AI into firing countermeasures.
- [ ] 67. **Network Latency:** Verify UI track positions lag slightly behind true positions based on datalink latency.
- [ ] 68. **EMCON Silence Drop:** Assert a unit entering EMCON Silent drops off friendly datalink if it lacks passive comms.
- [ ] 69. **COP Layer:** Verify toggling `COPTracksLayer` correctly displays the fused network uncertainty ellipses.
- [ ] 70. **Target ID Sync:** Assert when an AWACS identifies a track as "Hostile", all networked units update their UI.

## 8. Logistics, Environment & Settings (10 Tests)
- [ ] 71. **Landing Cycle:** Verify clicking a runway commands the aircraft to land, changing its state to `TurnaroundState.Landing`.
- [ ] 72. **Rearm/Refuel:** Assert aircraft in a facility automatically regenerate fuel and magazine counts over time.
- [ ] 73. **Sea State Impact:** Verify high sea state in `WeatherInjector` reduces sonar detection ranges on the map.
- [ ] 74. **Thermal Layers:** Assert submarine dropping below the layer depth immediately breaks surface sonar lock in the UI.
- [ ] 75. **Time Compression Safety:** Verify sim drops from 60x to 1x automatically when a "New Hostile Contact" is detected.
- [ ] 76. **Log Filtering:** Assert unchecking "SENSORS" in `TimeCompressionSafety` immediately hides sensor logs in the bottom panel.
- [ ] 77. **Map Layers Toggle:** Verify clicking a layer chip in the `Ribbon` immediately shows/hides the respective Pixi.js container.
- [x] 78. **Unit Selection:** Verify clicking a unit in `LeftPanelOOB` focuses the `TacticalMap` and populates the `RightPanelInspector`.
- [ ] 79. **Scenario Load:** Assert importing a JSON in `ScenarioManager` successfully wipes the current `World` and spawns the new units.
- [ ] 80. **Save State Consistency:** Verify saving a scenario, reloading it, and running it produces the exact same track outcomes.

## 9. UI Components & Edge Cases (10 Tests)
- [ ] 81. **Inspector Popout:** Verify clicking "Pop" in `RightPanelInspector` opens a functional detached window that syncs with the main app.
- [ ] 82. **Virtual List Scrolling:** Assert scrolling the `ContactTable` with 5,000 tracks maintains 60FPS using DOM recycling.
- [ ] 83. **Canvas Resize:** Verify resizing the browser window correctly resizes the Pixi.js application without distorting the aspect ratio.
- [ ] 84. **Null Selection:** Assert clearing unit selection gracefully empties the Inspector and `WeaponAllocationMatrix`.
- [ ] 85. **Input Debouncing:** Verify rapidly dragging the `SpeedAltitudeSlider` does not flood the server with 1,000 commands per second.
- [ ] 86. **Memory Leak Check:** Assert repeatedly loading different scenarios does not continuously increase browser memory usage.
- [ ] 87. **Z-Index Layering:** Verify UI modals (like FlightPlanEditor) always render above the Pixi.js canvas and Ribbon.
- [ ] 88. **Text Overflow:** Assert extremely long entity names in `LeftPanelOOB` truncate with an ellipsis rather than breaking the layout.
- [ ] 89. **Missing Profiles:** Verify the engine gracefully spawns a default "Unknown" box if commanded to spawn a nonexistent `profileId`.
- [ ] 90. **Coordinate Wrapping:** Assert units crossing the International Date Line (-180 to 180 lon) do not cause a UI rendering glitch.

## 10. Stress & Concurrency (10 Tests)
- [ ] 91. **10k Entity Tick:** Assert the backend `GatewayServer` maintains 10Hz tick rate with 10,000 active entities.
- [ ] 92. **High Compression Sync:** Verify 300x time compression correctly skips UI render frames but maintains perfect physics calculations.
- [ ] 93. **Mass Select/Command:** Assert selecting 50 units and issuing a group `SetCourse` command successfully queues without locking the UI.
- [ ] 94. **Concurrent Clients:** Verify 10 different browsers connected to the same match receive perfectly synchronized `VIEW_STATE` payloads.
- [ ] 95. **Spam Mitigation:** Assert the server ignores or rate-limits a client intentionally sending 10,000 garbage WebSocket messages.
- [ ] 96. **Missile Swarm Collision:** Verify 500 simultaneous missiles impacting a carrier group resolves damage correctly without a race condition.
- [ ] 97. **Trace Log Size:** Assert the `Tracer` correctly caps its memory usage when running a simulation for 24 real-time hours.
- [ ] 98. **Network Choke:** Verify the UI gracefully handles `VIEW_STATE` packets arriving out of order or delayed.
- [ ] 99. **Zero Delta State:** Assert that if no entities move or change state, the WebSocket payload size is minimized.
- [ ] 100. **Server Kill Recovery:** Verify if the Node.js server process is killed, the UI displays a clear "Connection Lost" overlay rather than freezing silently.



Total: 200 Tests | Target: 100% Logic Coverage

## 1. Core Engine & Lifecycle (20 Tests)
- [ ] 1. **Command Priority:** Verify `World` sorts commands by priority before execution.
- [ ] 2. **Command Preemption:** Ensure `DestroyEntity` cancels pending `Move` commands in the same tick.
- [ ] 3. **Tracer Serialization:** Verify `Tracer` records every command with the correct tick index.
- [ ] 4. **Tracer Playback:** Assert `Tracer` can rebuild world state from a log file.
- [ ] 5. **Spawn Hydration:** Verify `EntityManager.spawn` correctly populates components from profiles.
- [ ] 6. **Unique ID Generation:** Ensure every spawned entity has a globally unique ID.
- [ ] 7. **Component Integrity:** Verify `Entity.addComponent` does not overwrite existing components.
- [ ] 8. **Profile Validation:** Ensure `ProfileRegistry` rejects malformed Zod schemas.
- [ ] 9. **World Tick Consistency:** Assert `dt` is handled correctly in the main loop.
- [ ] 10. **System Ordering:** Verify systems execute in the correct dependency order.
- [ ] 11. **External Command Queueing:** Verify thread-safe command queueing from GatewayServer.
- [ ] 12. **Entity Removal:** Ensure components are cleaned up on entity destruction.
- [ ] 13. **Match Creation:** Verify `MatchService` initializes a world with the correct team sides.
- [ ] 14. **ViewState Snapshot:** Assert `ViewStateSystem` produces a side-perfect filtered view.
- [ ] 15. **Event Dispatching:** Verify `World.events` emits "ViewStateUpdated" after tick completion.
- [ ] 16. **Side Attribution:** Ensure entities are assigned to the correct `Side` enum.
- [ ] 17. **Profile Cloning:** Verify profiles are deep-copied during spawning.
- [ ] 18. **Missing Component Handling:** Assert systems gracefully skip entities missing dependencies.
- [ ] 19. **Tick Overflow:** Verify tick counter handles integer maximums (if applicable).
- [ ] 20. **Deterministic Output:** Ensure the same commands on the same state produce the same result.

## 2. Kinematics & Physics (30 Tests)
- [ ] 21. **Constant Velocity:** Verify unit moves correctly with no forces applied.
- [ ] 22. **Acceleration:** Assert `MovementSystem` integrates thrust into velocity.
- [ ] 23. **Mass Influence:** Verify heavier units accelerate slower for the same thrust.
- [ ] 24. **Atmospheric Drag:** Assert drag increases with the square of velocity (AeroComponent).
- [ ] 25. **Gravity Integration:** Verify weapon ballistic drop follows 9.81m/s².
- [ ] 26. **Turn Rate:** Assert unit respects maximum degrees-per-second turning.
- [ ] 27. **Pitch/Roll Limits:** Verify aerodynamic limits on vertical maneuvers.
- [ ] 28. **Mach Calculation:** Assert `AeroSystem` correctly calculates Mach based on altitude/temperature.
- [ ] 29. **Wave Drag:** Verify drag coefficient spike at Mach 0.8 - 1.2.
- [ ] 30. **Fuel Consumption:** Assert `PropulsionSystem` reduces fuel based on thrust level.
- [ ] 31. **Engine Flameout:** Verify thrust drops to zero when fuel is empty.
- [ ] 32. **Weight Change:** Assert mass decreases as fuel is consumed.
- [ ] 33. **Stall Speed:** Verify aircraft loses lift below critical airspeed.
- [ ] 34. **Service Ceiling:** Assert engine performance degrades with air density (altitude).
- [ ] 35. **Ground Collision:** Verify entity destruction on terrain impact.
- [ ] 36. **Water Depth Collision:** Verify submarine destruction below crush depth.
- [ ] 37. **Vector Addition:** Test `VectorMath.add` across 3D coordinates.
- [ ] 38. **Vector Magnitude:** Verify distance calculations between LLA and Cartesian.
- [ ] 39. **Quaternion Rotation:** Assert unit heading updates correctly via `TransformComponent`.
- [ ] 40. **Kinetic Energy:** Verify damage scaling based on impact velocity.
- [ ] 41. **Momentum Transfer:** Assert collision results in realistic velocity changes.
- [ ] 42. **Orbital Decay:** Verify satellite altitude loss over time (if using OrbitalSystem).
- [ ] 43. **Terminal Velocity:** Assert units reach a speed limit in freefall.
- [ ] 44. **Braking Logic:** Verify deceleration rates for ships and ground units.
- [ ] 45. **Climb Rate:** Assert maximum climb angle based on T/W ratio.
- [ ] 46. **G-Force Limits:** Verify structural damage when exceeding max-G turns.
- [ ] 47. **Parabolic Flight:** Assert weapon trajectories match mathematical parabolas.
- [ ] 48. **Impact Prediction:** Verify `Physics.predictImpact` matches actual collision point.
- [ ] 49. **Interpolation:** Verify `ViewState` position smoothing logic.
- [ ] 50. **Coordinate Wrapping:** Assert correct handling of 180/-180 longitude crossings.

## 3. Sensors & Perception (30 Tests)
- [ ] 51. **Radar Equation:** Verify SNR (Signal-to-Noise Ratio) calculation matches the 4th-power law.
- [ ] 52. **RCS Scaling:** Assert larger RCS leads to longer detection ranges.
- [ ] 53. **Radar Horizon:** Verify detection cuts off exactly at the horizon line based on height.
- [ ] 54. **Atmospheric Attenuation:** Assert range reduces in heavy rain/weather (EnvironmentComponent).
- [ ] 55. **Scan Period:** Verify targets only update when the radar beam sweeps them.
- [ ] 56. **Blind Zones:** Assert sensors cannot detect targets in defined blind arcs (aft/superstructure).
- [ ] 57. **ESM Bearing Only:** Verify ESM sensors produce lines-of-bearing, not precise locations.
- [ ] 58. **IRST Detection:** Assert heat signatures (IR) vary with engine thrust and Mach speed.
- [ ] 59. **Visual Detection:** Verify range is limited by daylight and cloud cover.
- [ ] 60. **Terrain Masking:** Assert targets behind mountains are invisible (TerrainOracle).
- [ ] 61. **Track File Creation:** Verify a new `Track` is created on first detection.
- [ ] 62. **Track Coasting:** Assert tracks persist for N ticks after losing line-of-sight.
- [ ] 63. **Track Dropping:** Verify tracks are deleted after the coasting timeout expires.
- [ ] 64. **Ambiguity Resolution:** Assert two nearby tracks are correctly fused or separated.
- [ ] 65. **False Alarms:** Verify noise spikes occasionally create ghost tracks (Probabilistic).
- [ ] 66. **Look-Down/Shoot-Down:** Assert ground clutter reduces radar performance against low targets.
- [ ] 67. **Identification (IFF):** Verify correct ID (Friend/Hostile) based on side.
- [ ] 68. **CEP Expansion:** Assert track error (CEP) grows as time since last seen increases.
- [ ] 69. **Sensor State Change:** Verify power-on/off time delays for large radars.
- [ ] 70. **EMCON Silence:** Assert active sensors turn off immediately in Silent mode.
- [ ] 71. **Frequency Agility:** Verify resistance to jamming based on sensor profile.
- [ ] 72. **Multipath Interference:** Assert signal degradation at very low altitudes over water.
- [ ] 73. **Doppler Shift:** Verify radial velocity influence on detection.
- [ ] 74. **Side Lobe Detection:** Assert high-power emitters can be detected outside the main beam.
- [ ] 75. **Acoustic Signature:** Verify ship noise varies with speed (Cavitating).
- [ ] 76. **Passive Sonar:** Assert detection range depends on ambient ocean noise.
- [ ] 77. **Active Sonar:** Verify ping-interval and reverb influence.
- [ ] 78. **Detection Event:** Ensure a `NEW_CONTACT` event is emitted on first detection.
- [ ] 79. **Track Update Rate:** Verify track coordinates update only on sensor refresh.
- [ ] 80. **Sensor Damage:** Assert detection range drops when Sensor subsystem is damaged.

## 4. Combat & Engagement (30 Tests)
- [ ] 81. **WRA Range Gate:** Verify weapon won't fire until target is within maxRange % WRA.
- [ ] 82. **Salvo Quantity:** Assert unit fires the exact number of weapons defined in WRA.
- [ ] 83. **ROE Compliance:** Verify unit does not fire in "Hold" ROE.
- [ ] 84. **Hostile Only ROE:** Assert unit fires only on "Hostile" in "Tight" ROE.
- [ ] 85. **Ballistic Solution:** Verify unguided weapons lead the target correctly.
- [ ] 86. **Mount Slewing:** Assert mount must rotate to target bearing before firing.
- [ ] 87. **Reload Ticks:** Verify delay between shots from the same mount.
- [ ] 88. **Magazine Depletion:** Assert mount cannot fire when magazine is empty.
- [ ] 89. **Weapon Staging:** Verify missile stages separate at correct times/altitudes.
- [ ] 90. **Guidance: Semi-Active:** Assert missile loses lock if shooter turns off radar.
- [ ] 91. **Guidance: Active:** Verify missile "goes active" at the terminal phase.
- [ ] 92. **Guidance: Command:** Assert missile follows line-of-sight from shooter.
- [ ] 93. **Proximity Fuze:** Verify detonation when within N meters of target.
- [ ] 94. **Direct Hit:** Assert detonation on physical collision.
- [ ] 95. **Blast Radius:** Verify damage falls off with distance from explosion.
- [ ] 96. **Damage Types:** Assert different behavior for Piercing vs. High-Explosive.
- [ ] 97. **Subsystem Damage:** Verify combat kills (Firepower Kill) when mounts are destroyed.
- [ ] 98. **Critical Hits:** Assert random chance for immediate destruction based on profile.
- [ ] 99. **Countermeasures: Chaff:** Verify radar missile decoy probability.
- [ ] 100. **Countermeasures: Flares:** Verify IR missile decoy probability.
- [ ] 101. **Interception:** Assert weapon-on-weapon collision works (ABM).
- [ ] 102. **Point Defense (CIWS):** Verify automatic engagement of incoming missiles.
- [ ] 103. **Engagement Limits:** Assert maximum number of simultaneous missile channels.
- [ ] 104. **Dud Rate:** Verify occasional weapon failure to detonate.
- [ ] 105. **Fire Event:** Ensure `WEAPON_FIRED` telemetry event is recorded.
- [ ] 106. **Kill Event:** Ensure `UNIT_DESTROYED` telemetry event is recorded.
- [ ] 107. **Expended Ordnance:** Verify magazine count reduces correctly.
- [ ] 108. **Targeting Priorities:** Assert AI chooses the most threatening target first.
- [ ] 109. **Line of Fire:** Verify unit won't fire if a friendly is in the way.
- [ ] 110. **Splash Damage:** Assert nearby units take damage from secondary explosions.

## 5. Electronic Warfare & Jamming (20 Tests)
- [ ] 111. **Noise Jamming:** Verify radar range reduction in the presence of noise.
- [ ] 112. **Burn-Through:** Assert radar detects target at close range despite jamming.
- [ ] 113. **Strobe Generation:** Verify UI displays EW strobes toward jammer.
- [ ] 114. **Deceptive Jamming:** Assert ghost tracks appear near the real target.
- [ ] 115. **DRFM Capability:** Verify jammer can mimic radar pulses.
- [ ] 116. **Spot vs. Barrage:** Assert different effectiveness based on frequency bandwidth.
- [ ] 117. **Home-on-Jam:** Verify missiles can target the jamming source directly.
- [ ] 118. **Stealth/LO:** Verify low-observable units have significantly reduced SNR.
- [ ] 119. **Plasma/Chaff Clouds:** Assert temporary radar masking in an area.
- [ ] 120. **Towed Decoys:** Verify missile bias toward the decoy behind the aircraft.

## 6. Subsurface & Sonar (20 Tests)
- [ ] 121. **Sound Velocity Profile:** Verify refraction based on depth/temperature.
- [ ] 122. **Convergence Zones:** Assert detection peaks at 30nm / 60nm intervals.
- [ ] 123. **Surface Ducting:** Verify long-range detection for shallow targets.
- [ ] 124. **The Layer:** Assert detection is blocked between surface and deep water.
- [ ] 125. **Crush Depth:** Verify hull damage below maximum depth.
- [ ] 126. **Thermal Layers:** Assert sonar range varies across temperature gradients.
- [ ] 127. **Bottom Bounce:** Verify detection via sea-floor reflection.
- [ ] 128. **Active Ping:** Verify counter-detection by ESM/Passive sonar.
- [ ] 129. **Towed Array:** Verify increased sensitivity but restricted maneuvering.
- [ ] 130. **Sonobuoy Deployment:** Verify buoy pattern activation and reporting.

## 7. Communication & Datalink (15 Tests)
- [ ] 131. **Datalink Range:** Assert tracks are only shared within radio range.
- [ ] 132. **Network Latency:** Verify track data is delayed by N ticks over link.
- [ ] 133. **CEC/Cooperative Engagement:** Assert unit A can fire using unit B's track.
- [ ] 134. **Link Jamming:** Verify sharing stops in high-EW environments.
- [ ] 135. **Bandwidth Limits:** Assert maximum number of shared tracks per link.

## 8. Environment & Terrain (15 Tests)
- [ ] 136. **Terrain Masking:** Assert 3D line-of-sight check against heightmap.
- [ ] 137. **Bathymetry:** Verify ocean depth limits for submarine ops.
- [ ] 138. **Weather Effects:** Assert performance drops in rain/fog/snow.
- [ ] 139. **Night Ops:** Verify visual range reduction after sunset.
- [ ] 140. **Geospatial Projection:** Verify distance math matches WGS84/Spherical.

## 9. State & UI Bridge (20 Tests)
- [ ] 141. **Signal Proxy:** Verify `UIStore` signals update on WebSocket message.
- [ ] 142. **ViewState Deltas:** Assert only changed data is sent to UI (Optimization).
- [ ] 143. **Selection Sync:** Verify clicking unit on map updates Inspector.
- [ ] 144. **Time Sync:** Verify UI clock matches engine tick count.
- [ ] 145. **Layer Logic:** Assert correct toggling of Pixi.js containers.

## 10. Scenario & Hydration (10 Tests)
- [ ] 146. **Manifest Loading:** Verify full world state rebuild from JSON.
- [ ] 147. **Entity Templating:** Assert variants (e.g. F-16C vs F-16D) inherit correctly.
- [ ] 148. **Scenario Start:** Verify all systems initialize at Tick 0.
- [ ] 149. **Save Consistency:** Assert saved state exactly matches current memory state.
- [ ] 150. **Invalid State Rejection:** Assert engine refuses to load corrupted manifests.

*(Remaining 50 tests cover edge cases, stress testing 10,000 entities, and specific platform logic for carrier ops/orbital mechanics)*

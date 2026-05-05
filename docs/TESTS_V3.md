### 1. Math & Geometry Fundamentals (`VectorMath`, `Geodesy`, `FireControl`)
1. **`VectorMath.add`**: Verify it correctly sums two 3D vectors.
2. **`VectorMath.subtract`**: Verify it calculates the correct difference between two 3D vectors.
3. **`VectorMath.multiplyScalar`**: Verify scalar multiplication scales all three axes correctly.
4. **`VectorMath.distance`**: Verify it returns the accurate Euclidean distance between two points.
5. **`VectorMath.magnitude`**: Verify it returns the correct length of a vector.
6. **`VectorMath.normalize`**: Verify it returns a unit vector (magnitude of 1).
7. **`VectorMath.normalize_zero`**: Verify it safely handles a zero vector without dividing by zero.
8. **`VectorMath.dot`**: Verify the dot product calculation for acute, obtuse, and orthogonal vectors.
9. **`VectorMath.rotateEuler`**: Verify a vector is correctly rotated by yaw, pitch, and roll in the forward direction.
10. **`VectorMath.rotateEulerInverse`**: Verify the inverse rotation returns the vector to its original local space.
11. **`Geodesy.haversineDistance`**: Verify great-circle distance between two known lat/lon coordinates matches standard Earth models.
12. **`Geodesy.llaToEcef`**: Verify Lat/Lon/Alt converts to the correct Earth-Centered Earth-Fixed XYZ coordinates.
13. **`Geodesy.ecefToLla`**: Verify ECEF XYZ converts back to the exact Lat/Lon/Alt.
14. **`Geodesy.ecefToEnu`**: Verify conversion to a Local Tangent Plane (East-North-Up) based on a reference origin.
15. **`Geodesy.enuToEcef`**: Verify ENU coordinates map back to global ECEF.
16. **`FireControl.calculateBallisticSolution_Hit`**: Verify it returns a valid `FireSolution` (aim point and TOF) for an interceptable target.
17. **`FireControl.calculateBallisticSolution_Miss`**: Verify it returns `undefined` if the target is too fast or out of range for the muzzle velocity.
18. **`FireControl.calculateBallisticSolution_Drop`**: Verify the aim point compensates vertically for gravity over the time of flight.
19. **`GeoProjection.project`**: Verify local engine meters translate to the correct geographic coordinates based on the origin.
20. **`GeoProjection.unproject`**: Verify geographic coordinates translate accurately back to local engine meters.

---

### 2. Core Engine & ECS (`Entity`, `World`, `CommandDispatcher`, `Octree`)
21. **`Entity.addComponent`**: Verify a component is properly attached and retrievable by its class type.
22. **`Entity.getComponents`**: Verify an entity can return multiple components of the same type (e.g., multiple `SensorComponent`s).
23. **`Entity.removeComponent`**: Verify removing a component makes `hasComponent` return false.
24. **`World.addEntity`**: Verify an entity is added to the global map and registered in the `Octree`.
25. **`World.removeEntity`**: Verify an entity is purged from the global map and the spatial partition.
26. **`World.tick_Advance`**: Verify calling `tick(dt)` increments the world `currentTick` and `timestamp`.
27. **`World.queueExternalCommand`**: Verify external commands are processed sequentially during the next tick.
28. **`World.pauseState`**: Verify that if `isPaused` is true, systems do not run, but queued commands still execute.
29. **`Octree.insert`**: Verify an entity ID is correctly placed in the root node or a subdivided child node based on position.
30. **`Octree.remove`**: Verify an entity ID is wiped from all nodes when removed.
31. **`Octree.updateEntity`**: Verify an entity crossing node boundaries is migrated to the correct new spatial node.
32. **`Octree.getNearbyEntities_Hit`**: Verify it returns entity IDs that fall within the query radius.
33. **`Octree.getNearbyEntities_Miss`**: Verify it ignores entity IDs just outside the query radius.
34. **`Octree.subdivide`**: Verify a node splits into 8 octants when the `MAX_ENTITIES` threshold is breached.
35. **`CommandDispatcher.register`**: Verify a handler is successfully mapped to a command class name.
36. **`CommandDispatcher.dispatch`**: Verify the correct handler `execute` function is called when a command is dispatched.
37. **`EventBus.on`**: Verify a subscribed callback fires when its specific event is emitted.
38. **`EventBus.off`**: Verify an unsubscribed callback no longer receives event emissions.
39. **`Tracer.record`**: Verify a dispatched command is logged with its deep-copied payload and tick number.
40. **`ComponentRegistry.create`**: Verify a component can be re-hydrated dynamically from a JSON payload.

---

### 3. Physics & Kinematics (`PhysicsSystem`, `MovementSystem`, `AeroSystem`)
41. **`PhysicsSystem.gravity`**: Verify an entity with mass experiences a downward `-Z` force equal to mass * G.
42. **`PhysicsSystem.thrust`**: Verify `thrustN` translates into a forward force aligned with the entity's current heading.
43. **`PhysicsSystem.integration`**: Verify net forces correctly update acceleration, which updates velocity.
44. **`PhysicsSystem.surfaceClamp`**: Verify surface/land entities do not fall through `Z = 0`.
45. **`MovementSystem.positionUpdate`**: Verify `velocity * dt` is correctly added to `TransformComponent.position`.
46. **`AeroSystem.machNumber`**: Verify Mach is calculated correctly based on true airspeed and local speed of sound.
47. **`AeroSystem.liftGeneration`**: Verify lift force increases exponentially with airspeed ($v^2$).
48. **`AeroSystem.dragGeneration`**: Verify drag force applies a negative vector directly opposing the velocity vector.
49. **`AeroSystem.stall`**: Verify that at speeds near zero, lift force approaches zero.
50. **`AeroSystem.bankedLift`**: Verify rolling an aircraft 90 degrees redirects the lift vector entirely to the Y-axis (horizontal).
51. **`KinematicsComponent.netForceReset`**: Verify net forces are zeroed out at the start of every tick before systems run.
52. **`SetPositionHandler`**: Verify the `SetPositionCommand` instantly overrides the `TransformComponent` coordinates.
53. **`SetHeadingHandler`**: Verify the command instantly overrides rotation for entities without a `NavigationComponent`.
54. **`ApplyForceHandler`**: Verify the command adds arbitrary Newton vectors directly to `netForce`.
55. **`CollisionSystem.sphereIntersection`**: Verify two overlapping `CollisionComponent`s trigger damage commands.
56. **`CollisionSystem.layerFiltering`**: Verify entities do not collide if their layers are not in each other's `collidesWith` array.
57. **`CollisionSystem.missileImpact`**: Verify a collision involving a 'missile' layer issues a `DestroyEntityCommand` for both entities.
58. **`CollisionSystem.continuousCollision`**: Verify high-speed projectiles calculate intersections along their sweep path, preventing tunneling.
59. **`OrbitalPhysicsSystem.meanAnomaly`**: Verify a satellite's position updates along a circular path based on elapsed epoch time.
60. **`OrbitalPhysicsSystem.altitude`**: Verify the Z-coordinate remains fixed at `-altitudeKm * 1000` (above Earth).

---

### 4. Sensors & Perception (`SensorSystem`, `ElectronicWarfare`)
61. **`SensorSystem.radarLOS`**: Verify radar cannot detect a target if `TerrainOracle.isLineOfSightClear` returns false.
62. **`SensorSystem.radarHorizon`**: Verify surface radar cannot detect a surface target beyond the curvature of the Earth.
63. **`SensorSystem.radarRange`**: Verify targets beyond `maxRangeM` are ignored entirely.
64. **`SensorSystem.radarRCS`**: Verify a target with a massive RCS is detected, while a stealth target (low RCS) fails the SNR threshold.
65. **`SensorSystem.radarClutter`**: Verify high sea states raise the noise floor and break locks on small surface targets.
66. **`SensorSystem.sonarCZ`**: Verify sonar gains a +25dB SNR boost if the target is exactly inside the 50km Convergence Zone annulus.
67. **`SensorSystem.sonarLayer`**: Verify a target below the thermocline (e.g., 150m) is hidden from a surface sonar (5m).
68. **`SensorSystem.sonarBothDeep`**: Verify a sub below the layer can detect another sub below the layer (isothermal ducting).
69. **`SensorSystem.esmDetection`**: Verify an ESM sensor detects a radiating radar at ranges far exceeding the radar's own detection range.
70. **`SensorSystem.esmSilent`**: Verify an ESM sensor detects nothing if the target radar is in `EMCON: Silent`.
71. **`SensorSystem.blindArcs`**: Verify a towed array sonar cannot detect a target in its rear 60-degree blind arc (the baffles).
72. **`SensorSystem.scanRate`**: Verify a rotating radar updates its `currentAzimuth` based on `scanPeriodS * dt`.
73. **`SensorSystem.beamwidth`**: Verify a directional sensor ignores targets outside its `beamWidthDeg` cone.
74. **`SensorSystem.dopplerNotch`**: Verify an active radar drops a track if the target's radial velocity approaches 0 (beaming).
75. **`SensorSystem.addDetection`**: Verify new contacts issue an `AddDetectionCommand` to the entity.
76. **`EW.sojJamming`**: Verify a Stand-Off Jammer raises the victim radar's noise floor, dropping existing tracks.
77. **`EW.spjJamming`**: Verify a Self-Protection Jammer masks its host entity but acts as a massive beacon to ESM.
78. **`EW.burnThrough`**: Verify a jammed radar regains its track if the target flies close enough to overcome the noise power.
79. **`EW.directionalJamming`**: Verify an SOJ only jams radars that fall within its `beamWidthDeg` emission cone.
80. **`EMCONHandler`**: Verify changing to `Silent` instantly sets `isActive = false` on all radiating sensors.

---

### 5. Track Management & Datalink (`TMSSystem`, `DatalinkSystem`)
81. **`TMSSystem.trackCreation`**: Verify a raw detection generates a `CreateTrackCommand` with an initialized `Track` object.
82. **`TMSSystem.trackCorrelation`**: Verify a detection matching an existing `trueEntityId` updates the existing track instead of duplicating it.
83. **`TMSSystem.deadReckoning`**: Verify a coasting track updates its position using its last known velocity * dt.
84. **`TMSSystem.cepExpansion`**: Verify a coasting track's CEP (uncertainty radius) grows linearly over time.
85. **`TMSSystem.trackDrop`**: Verify a track is purged from memory if it coasts past the `DROP_TIMEOUT_TICKS` threshold.
86. **`TMSSystem.cepReset`**: Verify a direct sensor update resets a coasting track's CEP back to 0.
87. **`TMSSystem.identification`**: Verify tracks from the same `Side` are instantly identified as `Friendly`.
88. **`TMSSystem.classification`**: Verify tracks with high altitudes are auto-classified as 'Air'.
89. **`TMSSystem.subClassification`**: Verify tracks with negative altitudes and acoustic signatures are classified as 'Subsurface'.
90. **`DropTrackHandler`**: Verify the command instantly deletes a track from the `TrackComponent` map.
91. **`DatalinkSystem.networkIsolation`**: Verify Blue Net members do not receive tracks broadcasted on Red Net.
92. **`DatalinkSystem.trackFusion`**: Verify the CTP (Common Tactical Picture) selects the track with the lowest CEP when multiple units track the same target.
93. **`DatalinkSystem.receiveOnly`**: Verify a unit with `canTransmit = false` receives the CTP but does not contribute its local tracks.
94. **`DatalinkSystem.latency`**: Verify shared tracks are pushed to the `incomingQueue` and only processed after `latencyTicks` has elapsed.
95. **`DatalinkSystem.powerState`**: Verify turning the Datalink `isActive = false` stops both transmission and reception.
96. **`DatalinkSystem.stalePurge`**: Verify processing the incoming queue clears out messages older than the current tick.
97. **`SyncTracksHandler`**: Verify incoming network tracks correctly overwrite local tracks if the network CEP is tighter.
98. **`SyncESMBearingsHandler`**: Verify ESM strobe lines are synchronized correctly to the `DetectionComponent`.
99. **`ViewStateSystem.trackDeduplication`**: Verify the UI bridge merges tracks with the same true ID before sending to the client.
100. **`ViewStateSystem.sideFilter`**: Verify Blue's UI snapshot never contains Red's internal tracks or unit data.

---

### 6. Combat & Weapons (`CombatSystem`, `HealthSystem`, `DamageDegradationSystem`)
101. **`CombatSystem.fireWeapon`**: Verify firing decrements the magazine `currentCount` by 1.
102. **`CombatSystem.reloadDelay`**: Verify a mount refuses to fire if `currentTick - lastFireTick < reloadTicks`.
103. **`CombatSystem.emptyMagazine`**: Verify a mount refuses to fire if `currentCount` is 0.
104. **`CombatSystem.slewRate`**: Verify a turreted mount gradually rotates `currentAzimuth` toward the target before firing.
105. **`CombatSystem.instantSlew`**: Verify VLS mounts (slewRate = 0) snap instantly to the target angle and fire.
106. **`CombatSystem.rangeCheck`**: Verify a weapon refuses to fire if the target's distance exceeds `maxRangeM`.
107. **`CombatSystem.altitudeBonus`**: Verify a missile's effective range increases if the shooter is at a high altitude.
108. **`HealthSystem.applyDamage`**: Verify taking damage reduces `hp`.
109. **`HealthSystem.destruction`**: Verify taking damage exceeding current `hp` sets `isDestroyed = true`.
110. **`HealthSystem.subsystemDamage`**: Verify targeted damage lowers specific subsystem HP without instantly destroying the hull.
111. **`DamageDegradation.fireDamage`**: Verify active fires apply hull damage every tick.
112. **`DamageDegradation.fireSpread`**: Verify fires have a random chance to damage functional subsystems over time.
113. **`DamageDegradation.flooding`**: Verify flooding reduces `structuralIntegrity` every tick.
114. **`DamageDegradation.sinking`**: Verify a ship is instantly destroyed when `structuralIntegrity` hits 0.
115. **`DamageDegradation.damageControl`**: Verify active fires have a statistical chance to extinguish automatically.
116. **`WeaponStageSystem.booster`**: Verify a new missile applies the Stage 0 `thrustN` value immediately.
117. **`WeaponStageSystem.stageTransition`**: Verify after `durationTicks`, the missile advances to Stage 1 and updates thrust.
118. **`WeaponStageSystem.burnout`**: Verify thrust drops to 0 when the final stage duration expires.
119. **`SetConditionHandler`**: Verify the command can manually overwrite the number of active fires and flooding severity.
120. **`ApplySubsystemDamageHandler`**: Verify the command correctly flags `isFunctional = false` when subsystem HP hits 0.

---

### 7. Guidance, Navigation & Flight Control (`GuidanceSystem`, `ControlSystem`, `WaypointSystem`)
121. **`GuidanceSystem.sarhIllumination`**: Verify a SARH missile loses lock if the launching ship drops its illumination radar.
122. **`GuidanceSystem.arhSelfLock`**: Verify an ARH missile holds lock as long as its internal `SensorComponent` detects the target.
123. **`GuidanceSystem.irLock`**: Verify an IR missile holds lock simply based on line-of-sight detection.
124. **`ControlSystem.headingP_Controller`**: Verify a heading error generates a proportional lateral bank force.
125. **`ControlSystem.altitudeP_Controller`**: Verify an altitude error generates a proportional vertical lift/dive force.
126. **`ControlSystem.throttleP_Controller`**: Verify a speed error correctly adjusts the `PropulsionComponent` throttle between 0.0 and 1.0.
127. **`WaypointSystem.arrival`**: Verify passing within `arrivalToleranceM` of a waypoint increments the `activeWaypointIndex`.
128. **`WaypointSystem.routeCompletion`**: Verify reaching the final waypoint resets `navState` to `None`.
129. **`WaypointSystem.terrainFollowing`**: Verify an aircraft pitches up violently if its altitude drops within 200m of the terrain directly ahead.
130. **`WaypointSystem.timeOnTarget`**: Verify the system increases `desiredSpeedKts` to ensure arrival at the specified `targetTick`.
131. **`FormationSystem.offsetCalculation`**: Verify a follower calculates its world-space station correctly based on the leader's rotation.
132. **`FormationSystem.sprintAndDrift`**: Verify a follower increases speed if trailing >50m, and decreases speed if <5m from station.
133. **`CommissarSystem.patrolGeneration`**: Verify the group leader automatically generates a `TaskType.Patrol` DAG.
134. **`CommissarSystem.wedgeFormation`**: Verify followers are assigned correct left/right/aft offsets when the group is in a Wedge.
135. **`TaskReconciler.navigateTask`**: Verify a pending `Navigate` task transitions to `Active` and issues heading commands.
136. **`NavigationWorker.arrival`**: Verify reaching the target marks the specific DAG node as `Completed`.
137. **`AddWaypointHandler`**: Verify the command appends a WP and changes the state to `NavState.Waypoint`.
138. **`ClearWaypointsHandler`**: Verify the command wipes the WP array and halts automated navigation.
139. **`SetFormationHandler`**: Verify the command attaches a `FormationComponent` with the correct leader ID.
140. **`BreakFormationHandler`**: Verify the command strips the `FormationComponent` and frees the unit to maneuver independently.

---

### 8. Logistics, Fuel & Bases (`LogisticsSystem`, `PropulsionSystem`)
141. **`PropulsionSystem.throttleScaling`**: Verify dry thrust scales linearly with throttle from 0.0 to 0.95.
142. **`PropulsionSystem.afterburner`**: Verify pushing throttle > 0.95 engages `EngineState.Afterburner` and uses `maxThrustAbN`.
143. **`PropulsionSystem.altitudeDegradation`**: Verify maximum thrust drops proportionally to local air density.
144. **`PropulsionSystem.spoolRate`**: Verify a massive throttle change takes several ticks to reach target thrust (spooling).
145. **`PropulsionSystem.fuelConsumption`**: Verify fuel decreases based on thrust output and Specific Fuel Consumption (SFC).
146. **`PropulsionSystem.bingoCalculation`**: Verify `isBingo` triggers when fuel drops below the amount needed to return to base + 10%.
147. **`PropulsionSystem.flameout`**: Verify thrust drops to 0 instantly if `currentKg` of fuel hits 0.
148. **`LogisticsSystem.landing`**: Verify an aircraft transitions to `Taxiing` after `stateDurationTicks` expires in the `Landing` state.
149. **`LogisticsSystem.rearming`**: Verify a base transfers ammo to empty aircraft magazines during the `Rearming` state.
150. **`LogisticsSystem.refueling`**: Verify a base transfers fuel to the aircraft during the `Refueling` state.
151. **`LogisticsSystem.unrep`**: Verify a surface ship passively receives fuel when sailing within 1km of an Oiler facility.
152. **`TransferResourcesHandler`**: Verify fuel moves correctly from the donor facility to the receiving entity without exceeding max capacity.
153. **`TransferResourcesHandler.ammo`**: Verify specific weapon profile counts are deducted from the base and added to the aircraft.
154. **`LandAtFacilityHandler`**: Verify the aircraft is added to the base's `hostedEntityIds` if hangar space is available.
155. **`LandAtFacilityHandler.full`**: Verify the command is ignored if the base hangar is at maximum capacity.
156. **`SetLoadoutHandler`**: Verify applying a loadout correctly overrides the aircraft's `CombatComponent` magazines.
157. **`FacilityComponent.reserves`**: Verify a base cannot transfer fuel it does not have in `fuelReservesKg`.
158. **`UpdateLogisticsStateHandler`**: Verify the command forcefully transitions an entity to a new turnaround phase.
159. **`ConsumeFuelHandler`**: Verify the command deducts the exact float amount of fuel and checks for bingo state.
160. **`MobilityKill`**: Verify the destruction of all `Propulsion` subsystems forces engine thrust to 0 permanently.

---

### 9. Environment & Geography (`EnvironmentSystem`, `Pathfinder`)
161. **`EnvironmentSystem.terrainHeight`**: Verify `terrainHeightM` matches the Oracle's elevation for the entity's Lat/Lon.
162. **`EnvironmentSystem.isGrounded`**: Verify the flag triggers when `TransformComponent.z` drops below the local terrain height.
163. **`EnvironmentSystem.isaDensity`**: Verify standard atmosphere calculations drop density correctly up to the 11km tropopause.
164. **`EnvironmentSystem.sspThermocline`**: Verify ocean temperature drops rapidly between 100m and 1000m depth.
165. **`EnvironmentSystem.sspDeepIso`**: Verify ocean temperature stabilizes at 4°C below 1000m.
166. **`EnvironmentSystem.sspSoundSpeed`**: Verify the Mackenzie equation outputs ~1480-1530 m/s based on depth and temperature.
167. **`SetEnvironmentHandler`**: Verify global weather injections (e.g., Rain = 25mm/hr) update the system state.
168. **`UpdateEnvironmentCommand`**: Verify the command successfully pushes Oracle data into the local `EnvironmentComponent`.
169. **`Pathfinder.clearPath`**: Verify A* returns a straight line of waypoints if there are no terrain obstacles.
170. **`Pathfinder.obstacleAvoidance`**: Verify A* routes around a mountain peak that exceeds the requested `minAltitude`.
171. **`TerrainOracle.interpolation`**: Verify a query exactly between two known grid points returns the precise mathematical average.
172. **`TerrainOracle.lineOfSight`**: Verify `isLineOfSightClear` returns true over flat ocean.
173. **`TerrainOracle.lineOfSightBlocked`**: Verify it returns false if any sampled midpoint elevation is higher than the raycast altitude.
174. **`MapDataService.bathymetry`**: Verify it successfully parses and returns GeoJSON depth lines.
175. **`MapDataService.borders`**: Verify it successfully parses and returns GeoJSON political boundary lines.

---

### 10. Doctrine, AI & Execution (`DoctrineSystem`, `WRAExecutorSystem`, `MissionSystem`)
176. **`DoctrineSystem.emconActive`**: Verify units in `EMCON: Active` automatically turn their radar components on.
177. **`DoctrineSystem.emconSilent`**: Verify units in `EMCON: Silent` automatically turn their radar components off.
178. **`WRAExecutorSystem.roeFree`**: Verify the system fires on UNKNOWN contacts if ROE is set to FREE.
179. **`WRAExecutorSystem.roeTight`**: Verify the system ONLY fires on confirmed HOSTILE contacts if ROE is TIGHT.
180. **`WRAExecutorSystem.roeHold`**: Verify the system never fires autonomously if ROE is HOLD.
181. **`WRAExecutorSystem.targetTypeMatch`**: Verify a WRA rule designated for "Air" targets is ignored when evaluating a "Surface" track.
182. **`WRAExecutorSystem.rangePercentage`**: Verify a missile is held back until the target closes to the specific `maxRangePct` (e.g., 75% of Rmax).
183. **`WRAExecutorSystem.salvoQuantity`**: Verify the system fires exactly N weapons according to the `quantity` parameter in the rule.
184. **`WRAExecutorSystem.weaponMatching`**: Verify the system skips mounts that do not contain the specific weapon requested by the WRA rule.
185. **`MissionSystem.strike`**: Verify a Strike mission generates a navigation DAG node aiming for the specific target track's position.
186. **`MissionSystem.patrol`**: Verify a Patrol mission transitions from Pending to Active and updates the `DoctrineComponent` if required.
187. **`SetROEHandler`**: Verify the command successfully overrides a specific unit's local ROE state.
188. **`SetSideROEHandler`**: Verify the command recursively updates the ROE for every unit belonging to the specified Side.
189. **`SetMissionROEHandler`**: Verify the command updates the ROE for a group leader and all of its subordinates.
190. **`UpdateWRARulesHandler`**: Verify pushing a new JSON ruleset overwrites the `wraRules` array in the Doctrine component.
191. **`AssignWeaponHandler`**: Verify a manual assignment command locks a specific mount to a specific target ID.
192. **`TaskGraph.dependencyCheck`**: Verify a child node remains `Pending` until its parent node achieves `Completed` status.
193. **`TaskGraph.failureCascade`**: Verify marking a parent node as `Failed` recursively fails all dependent child nodes.
194. **`MinistryOfStrike.evaluate`**: Verify the Ministry correctly extracts the spatial coordinates of a target from the TMS.
195. **`MinistryOfPatrol.evaluate`**: Verify the Ministry correctly declares a spatial area as the objective.
196. **`LoadoutRegistry.get`**: Verify an aircraft can query available profiles mapped to its platform class.
197. **`EntityManager.spawn`**: Verify hydration successfully maps JSON profile blueprints into a living `Entity` with instantiated components.
198. **`ScenarioLoader.manifest`**: Verify passing a `ScenarioManifest` successfully loops and spawns all requested entities.
199. **`WeaponProfileRegistry.effectiveRange`**: Verify the static Rmax calculation incorporates the aerodynamic altitude bonus correctly.
200. **`FireWeaponHandler`**: Verify the explicit `FireWeaponCommand` bypasses WRA rules entirely and forces the mount to expend ordnance.
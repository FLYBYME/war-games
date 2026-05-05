# Engine V3 Test Implementation Checklist

This checklist tracks the implementation and verification status of the 200 core test cases defined in `docs/TESTS_V3.md`.

## 1. Math & Geometry Fundamentals
- [x] 1. **`VectorMath.add`**: Verify it correctly sums two 3D vectors.
- [x] 2. **`VectorMath.subtract`**: Verify it calculates the correct difference between two 3D vectors.
- [x] 3. **`VectorMath.multiplyScalar`**: Verify scalar multiplication scales all three axes correctly.
- [x] 4. **`VectorMath.distance`**: Verify it returns the accurate Euclidean distance between two points.
- [x] 5. **`VectorMath.magnitude`**: Verify it returns the correct length of a vector.
- [x] 6. **`VectorMath.normalize`**: Verify it returns a unit vector (magnitude of 1).
- [x] 7. **`VectorMath.normalize_zero`**: Verify it safely handles a zero vector without dividing by zero.
- [x] 8. **`VectorMath.dot`**: Verify the dot product calculation for acute, obtuse, and orthogonal vectors.
- [x] 9. **`VectorMath.rotateEuler`**: Verify a vector is correctly rotated by yaw, pitch, and roll in the forward direction.
- [x] 10. **`VectorMath.rotateEulerInverse`**: Verify the inverse rotation returns the vector to its original local space.
- [x] 11. **`Geodesy.haversineDistance`**: Verify great-circle distance between two known lat/lon coordinates matches standard Earth models.
- [x] 12. **`Geodesy.llaToEcef`**: Verify Lat/Lon/Alt converts to the correct Earth-Centered Earth-Fixed XYZ coordinates.
- [x] 13. **`Geodesy.ecefToLla`**: Verify ECEF XYZ converts back to the exact Lat/Lon/Alt.
- [x] 14. **`Geodesy.ecefToEnu`**: Verify conversion to a Local Tangent Plane (East-North-Up) based on a reference origin.
- [x] 15. **`Geodesy.enuToEcef`**: Verify ENU coordinates map back to global ECEF.
- [x] 16. **`FireControl.calculateBallisticSolution_Hit`**: Verify it returns a valid `FireSolution` (aim point and TOF) for an interceptable target.
- [x] 17. **`FireControl.calculateBallisticSolution_Miss`**: Verify it returns `undefined` if the target is too fast or out of range for the muzzle velocity.
- [x] 18. **`FireControl.calculateBallisticSolution_Drop`**: Verify the aim point compensates vertically for gravity over the time of flight.
- [x] 19. **`GeoProjection.project`**: Verify local engine meters translate to the correct geographic coordinates based on the origin.
- [x] 20. **`GeoProjection.unproject`**: Verify geographic coordinates translate accurately back to local engine meters.

## 2. Core Engine & ECS
- [x] 21. **`Entity.addComponent`**: Verify a component is properly attached and retrievable by its class type.
- [x] 22. **`Entity.getComponents`**: Verify an entity can return multiple components of the same type (e.g., multiple `SensorComponent`s).
- [x] 23. **`Entity.removeComponent`**: Verify removing a component makes `hasComponent` return false.
- [x] 24. **`World.addEntity`**: Verify an entity is added to the global map and registered in the `Octree`.
- [x] 25. **`World.removeEntity`**: Verify an entity is purged from the global map and the spatial partition.
- [x] 26. **`World.tick_Advance`**: Verify calling `tick(dt)` increments the world `currentTick` and `timestamp`.
- [x] 27. **`World.queueExternalCommand`**: Verify external commands are processed sequentially during the next tick.
- [x] 28. **`World.pauseState`**: Verify that if `isPaused` is true, systems do not run, but queued commands still execute.
- [x] 29. **`Octree.insert`**: Verify an entity ID is correctly placed in the root node or a subdivided child node based on position.
- [x] 30. **`Octree.remove`**: Verify an entity ID is wiped from all nodes when removed.
- [x] 31. **`Octree.updateEntity`**: Verify an entity crossing node boundaries is migrated to the correct new spatial node.
- [x] 32. **`Octree.getNearbyEntities_Hit`**: Verify it returns entity IDs that fall within the query radius.
- [x] 33. **`Octree.getNearbyEntities_Miss`**: Verify it ignores entity IDs just outside the query radius.
- [x] 34. **`Octree.subdivide`**: Verify a node splits into 8 octants when the `MAX_ENTITIES` threshold is breached.
- [x] 35. **`CommandDispatcher.register`**: Verify a handler is successfully mapped to a command class name.
- [x] 36. **`CommandDispatcher.dispatch`**: Verify the correct handler `execute` function is called when a command is dispatched.
- [x] 37. **`EventBus.on`**: Verify a subscribed callback fires when its specific event is emitted.
- [x] 38. **`EventBus.off`**: Verify an unsubscribed callback no longer receives event emissions.
- [x] 39. **`Tracer.record`**: Verify a dispatched command is logged with its deep-copied payload and tick number.
- [x] 40. **`ComponentRegistry.create`**: Verify a component can be re-hydrated dynamically from a JSON payload.

## 3. Physics & Kinematics
- [x] 41. **`PhysicsSystem.gravity`**: Verify an entity with mass experiences a downward `-Z` force equal to mass * G.
- [x] 42. **`PhysicsSystem.thrust`**: Verify `thrustN` translates into a forward force aligned with the entity's current heading.
- [x] 43. **`PhysicsSystem.integration`**: Verify net forces correctly update acceleration, which updates velocity.
- [x] 44. **`PhysicsSystem.surfaceClamp`**: Verify surface/land entities do not fall through `Z = 0`.
- [x] 45. **`MovementSystem.positionUpdate`**: Verify `velocity * dt` is correctly added to `TransformComponent.position`.
- [x] 46. **`AeroSystem.machNumber`**: Verify Mach is calculated correctly based on true airspeed and local speed of sound.
- [x] 47. **`AeroSystem.liftGeneration`**: Verify lift force increases exponentially with airspeed ($v^2$).
- [x] 48. **`AeroSystem.dragGeneration`**: Verify drag force applies a negative vector directly opposing the velocity vector.
- [x] 49. **`AeroSystem.stall`**: Verify that at speeds near zero, lift force approaches zero.
- [x] 50. **`AeroSystem.bankedLift`**: Verify rolling an aircraft 90 degrees redirects the lift vector entirely to the Y-axis (horizontal).
- [x] 51. **`KinematicsComponent.netForceReset`**: Verify net forces are zeroed out at the start of every tick before systems run.
- [x] 52. **`SetPositionHandler`**: Verify the `SetPositionCommand` instantly overrides the `TransformComponent` coordinates.
- [x] 53. **`SetHeadingHandler`**: Verify the command instantly overrides rotation for entities without a `NavigationComponent`.
- [x] 54. **`ApplyForceHandler`**: Verify the command adds arbitrary Newton vectors directly to `netForce`.
- [x] 55. **`CollisionSystem.sphereIntersection`**: Verify two overlapping `CollisionComponent`s trigger damage commands.
- [x] 56. **`CollisionSystem.layerFiltering`**: Verify entities do not collide if their layers are not in each other's `collidesWith` array.
- [x] 57. **`CollisionSystem.missileImpact`**: Verify a collision involving a 'missile' layer issues a `DestroyEntityCommand` for both entities.
- [x] 58. **`CollisionSystem.continuousCollision`**: Verify high-speed projectiles calculate intersections along their sweep path, preventing tunneling.
- [x] 59. **`OrbitalPhysicsSystem.meanAnomaly`**: Verify a satellite's position updates along a circular path based on elapsed epoch time.
- [x] 60. **`OrbitalPhysicsSystem.altitude`**: Verify the Z-coordinate remains fixed at `-altitudeKm * 1000` (above Earth).

## 4. Sensors & Perception
- [x] 61. **`SensorSystem.radarLOS`**: Verify radar cannot detect a target if `TerrainOracle.isLineOfSightClear` returns false.
- [x] 62. **`SensorSystem.radarHorizon`**: Verify surface radar cannot detect a surface target beyond the curvature of the Earth.
- [x] 63. **`SensorSystem.radarRange`**: Verify targets beyond `maxRangeM` are ignored entirely.
- [x] 64. **`SensorSystem.radarRCS`**: Verify a target with a massive RCS is detected, while a stealth target (low RCS) fails the SNR threshold.
- [x] 65. **`SensorSystem.radarClutter`**: Verify high sea states raise the noise floor and break locks on small surface targets.
- [x] 66. **`SensorSystem.sonarCZ`**: Verify sonar gains a +25dB SNR boost if the target is exactly inside the 50km Convergence Zone annulus.
- [x] 67. **`SensorSystem.sonarLayer`**: Verify a target below the thermocline (e.g., 150m) is hidden from a surface sonar (5m).
- [x] 68. **`SensorSystem.sonarBothDeep`**: Verify a sub below the layer can detect another sub below the layer (isothermal ducting).
- [x] 69. **`SensorSystem.esmDetection`**: Verify an ESM sensor detects a radiating radar at ranges far exceeding the radar's own detection range.
- [x] 70. **`SensorSystem.esmSilent`**: Verify an ESM sensor detects nothing if the target radar is in `EMCON: Silent`.
- [x] 71. **`SensorSystem.blindArcs`**: Verify a towed array sonar cannot detect a target in its rear 60-degree blind arc (the baffles).
- [x] 72. **`SensorSystem.scanRate`**: Verify a rotating radar updates its `currentAzimuth` based on `scanPeriodS * dt`.
- [x] 73. **`SensorSystem.beamwidth`**: Verify a directional sensor ignores targets outside its `beamWidthDeg` cone.
- [x] 74. **`SensorSystem.dopplerNotch`**: Verify an active radar drops a track if the target's radial velocity approaches 0 (beaming).
- [x] 75. **`SensorSystem.addDetection`**: Verify new contacts issue an `AddDetectionCommand` to the entity.
- [x] 76. **`EW.sojJamming`**: Verify a Stand-Off Jammer raises the victim radar's noise floor, dropping existing tracks.
- [x] 77. **`EW.spjJamming`**: Verify a Self-Protection Jammer masks its host entity but acts as a massive beacon to ESM.
- [x] 78. **`EW.burnThrough`**: Verify a jammed radar regains its track if the target flies close enough to overcome the noise power.
- [x] 79. **`EW.directionalJamming`**: Verify an SOJ only jams radars that fall within its `beamWidthDeg` emission cone.
- [x] 80. **`EMCONHandler`**: Verify changing to `Silent` instantly sets `isActive = false` on all radiating sensors.

## 5. Track Management & Datalink
- [x] 81. **`TMSSystem.trackCreation`**: Verify a raw detection generates a `CreateTrackCommand` with an initialized `Track` object.
- [x] 82. **`TMSSystem.trackCorrelation`**: Verify a detection matching an existing `trueEntityId` updates the existing track instead of duplicating it.
- [x] 83. **`TMSSystem.deadReckoning`**: Verify a coasting track updates its position using its last known velocity * dt.
- [x] 84. **`TMSSystem.cepExpansion`**: Verify a coasting track's CEP (uncertainty radius) grows linearly over time.
- [x] 85. **`TMSSystem.trackDrop`**: Verify a track is purged from memory if it coasts past the `DROP_TIMEOUT_TICKS` threshold.
- [x] 86. **`TMSSystem.cepReset`**: Verify a direct sensor update resets a coasting track's CEP back to 0.
- [x] 87. **`TMSSystem.identification`**: Verify tracks from the same `Side` are instantly identified as `Friendly`.
- [x] 88. **`TMSSystem.classification`**: Verify tracks with high altitudes are auto-classified as 'Air'.
- [x] 89. **`TMSSystem.subClassification`**: Verify tracks with negative altitudes and acoustic signatures are classified as 'Subsurface'.
- [x] 90. **`DropTrackHandler`**: Verify the command instantly deletes a track from the `TrackComponent` map.
- [x] 91. **`DatalinkSystem.networkIsolation`**: Verify Blue Net members do not receive tracks broadcasted on Red Net.
- [x] 92. **`DatalinkSystem.trackFusion`**: Verify the CTP (Common Tactical Picture) selects the track with the lowest CEP when multiple units track the same target.
- [x] 93. **`DatalinkSystem.receiveOnly`**: Verify a unit with `canTransmit = false` receives the CTP but does not contribute its local tracks.
- [x] 94. **`DatalinkSystem.latency`**: Verify shared tracks are pushed to the `incomingQueue` and only processed after `latencyTicks` has elapsed.
- [x] 95. **`DatalinkSystem.powerState`**: Verify turning the Datalink `isActive = false` stops both transmission and reception.
- [x] 96. **`DatalinkSystem.stalePurge`**: Verify processing the incoming queue clears out messages older than the current tick.
- [x] 97. **`SyncTracksHandler`**: Verify incoming network tracks correctly overwrite local tracks if the network CEP is tighter.
- [ ] 98. **`SyncESMBearingsHandler`**: Verify ESM strobe lines are synchronized correctly to the `DetectionComponent`.
- [x] 99. **`ViewStateSystem.trackDeduplication`**: Verify the UI bridge merges tracks with the same true ID before sending to the client.
- [x] 100. **`ViewStateSystem.sideFilter`**: Verify Blue's UI snapshot never contains Red's internal tracks or unit data.

## 6. Combat & Weapons
- [x] 101. **`CombatSystem.fireWeapon`**: Verify firing decrements the magazine `currentCount` by 1.
- [x] 102. **`CombatSystem.reloadDelay`**: Verify a mount refuses to fire if `currentTick - lastFireTick < reloadTicks`.
- [x] 103. **`CombatSystem.emptyMagazine`**: Verify a mount refuses to fire if `currentCount` is 0.
- [x] 104. **`CombatSystem.slewRate`**: Verify a turreted mount gradually rotates `currentAzimuth` toward the target before firing.
- [x] 105. **`CombatSystem.instantSlew`**: Verify VLS mounts (slewRate = 0) snap instantly to the target angle and fire.
- [x] 106. **`CombatSystem.rangeCheck`**: Verify a weapon refuses to fire if the target's distance exceeds `maxRangeM`.
- [x] 107. **`CombatSystem.altitudeBonus`**: Verify a missile's effective range increases if the shooter is at a high altitude.
- [x] 108. **`HealthSystem.applyDamage`**: Verify taking damage reduces `hp`.
- [x] 109. **`HealthSystem.destruction`**: Verify taking damage exceeding current `hp` sets `isDestroyed = true`.
- [x] 110. **`HealthSystem.subsystemDamage`**: Verify targeted damage lowers specific subsystem HP without instantly destroying the hull.
- [x] 111. **`DamageDegradation.fireDamage`**: Verify active fires apply hull damage every tick.
- [x] 112. **`DamageDegradation.fireSpread`**: Verify fires have a random chance to damage functional subsystems over time.
- [x] 113. **`DamageDegradation.flooding`**: Verify flooding reduces `structuralIntegrity` every tick.
- [x] 114. **`DamageDegradation.sinking`**: Verify a ship is instantly destroyed when `structuralIntegrity` hits 0.
- [ ] 115. **`DamageDegradation.damageControl`**: Verify active fires have a statistical chance to extinguish automatically.
- [x] 116. **`WeaponStageSystem.booster`**: Verify a new missile applies the Stage 0 `thrustN` value immediately.
- [x] 117. **`WeaponStageSystem.stageTransition`**: Verify after `durationTicks`, the missile advances to Stage 1 and updates thrust.
- [x] 118. **`WeaponStageSystem.burnout`**: Verify thrust drops to 0 when the final stage duration expires.
- [x] 119. **`SetConditionHandler`**: Verify the command can manually overwrite the number of active fires and flooding severity.
- [x] 120. **`ApplySubsystemDamageHandler`**: Verify the command correctly flags `isFunctional = false` when subsystem HP hits 0.

## 7. Guidance, Navigation & Flight Control
- [x] 121. **`GuidanceSystem.sarhIllumination`**: Verify a SARH missile loses lock if the launching ship drops its illumination radar.
- [x] 122. **`GuidanceSystem.arhSelfLock`**: Verify an ARH missile holds lock as long as its internal `SensorComponent` detects the target.
- [x] 123. **`GuidanceSystem.irLock`**: Verify an IR missile holds lock simply based on line-of-sight detection.
- [x] 124. **`ControlSystem.headingP_Controller`**: Verify a heading error generates a proportional lateral bank force.
- [x] 125. **`ControlSystem.altitudeP_Controller`**: Verify an altitude error generates a proportional vertical lift/dive force.
- [x] 126. **`ControlSystem.throttleP_Controller`**: Verify a speed error correctly adjusts the `PropulsionComponent` throttle between 0.0 and 1.0.
- [x] 127. **`WaypointSystem.arrival`**: Verify passing within `arrivalToleranceM` of a waypoint increments the `activeWaypointIndex`.
- [x] 128. **`WaypointSystem.routeCompletion`**: Verify reaching the final waypoint resets `navState` to `None`.
- [x] 129. **`WaypointSystem.terrainFollowing`**: Verify an aircraft pitches up violently if its altitude drops within 200m of the terrain directly ahead.
- [x] 130. **`WaypointSystem.timeOnTarget`**: Verify the system increases `desiredSpeedKts` to ensure arrival at the specified `targetTick`.
- [x] 131. **`FormationSystem.offsetCalculation`**: Verify a follower calculates its world-space station correctly based on the leader's rotation.
- [x] 132. **`FormationSystem.sprintAndDrift`**: Verify a follower increases speed if trailing >50m, and decreases speed if <5m from station.
- [x] 133. **`CommissarSystem.patrolGeneration`**: Verify the group leader automatically generates a `TaskType.Patrol` DAG.
- [ ] 134. **`CommissarSystem.wedgeFormation`**: Verify followers are assigned correct left/right/aft offsets when the group is in a Wedge.
- [x] 135. **`TaskReconciler.navigateTask`**: Verify a pending `Navigate` task transitions to `Active` and issues heading commands.
- [x] 136. **`NavigationWorker.arrival`**: Verify reaching the target marks the specific DAG node as `Completed`.
- [x] 137. **`AddWaypointHandler`**: Verify the command appends a WP and changes the state to `NavState.Waypoint`.
- [x] 138. **`ClearWaypointsHandler`**: Verify the command wipes the WP array and halts automated navigation.
- [x] 139. **`SetFormationHandler`**: Verify the command attaches a `FormationComponent` with the correct leader ID.
- [x] 140. **`BreakFormationHandler`**: Verify the command strips the `FormationComponent` and frees the unit to maneuver independently.

## 8. Logistics, Fuel & Bases
- [x] 141. **`PropulsionSystem.throttleScaling`**: Verify dry thrust scales linearly with throttle from 0.0 to 0.95.
- [x] 142. **`PropulsionSystem.afterburner`**: Verify pushing throttle > 0.95 engages `EngineState.Afterburner` and uses `maxThrustAbN`.
- [x] 143. **`PropulsionSystem.altitudeDegradation`**: Verify maximum thrust drops proportionally to local air density.
- [x] 144. **`PropulsionSystem.spoolRate`**: Verify a massive throttle change takes several ticks to reach target thrust (spooling).
- [x] 145. **`PropulsionSystem.fuelConsumption`**: Verify fuel decreases based on thrust output and Specific Fuel Consumption (SFC).
- [x] 146. **`PropulsionSystem.bingoCalculation`**: Verify `isBingo` triggers when fuel drops below the amount needed to return to base + 10%.
- [x] 147. **`PropulsionSystem.flameout`**: Verify thrust drops to 0 instantly if `currentKg` of fuel hits 0.
- [x] 148. **`LogisticsSystem.landing`**: Verify an aircraft transitions to `Taxiing` after `stateDurationTicks` expires in the `Landing` state.
- [x] 149. **`LogisticsSystem.rearming`**: Verify a base transfers ammo to empty aircraft magazines during the `Rearming` state.
- [x] 150. **`LogisticsSystem.refueling`**: Verify a base transfers fuel to the aircraft during the `Refueling` state.
- [x] 151. **`LogisticsSystem.unrep`**: Verify a surface ship passively receives fuel when sailing within 1km of an Oiler facility.
- [x] 152. **`TransferResourcesHandler`**: Verify fuel moves correctly from the donor facility to the receiving entity without exceeding max capacity.
- [x] 153. **`TransferResourcesHandler.ammo`**: Verify specific weapon profile counts are deducted from the base and added to the aircraft.
- [x] 154. **`LandAtFacilityHandler`**: Verify the aircraft is added to the base's `hostedEntityIds` if hangar space is available.
- [x] 155. **`LandAtFacilityHandler.full`**: Verify the command is ignored if the base hangar is at maximum capacity.
- [x] 156. **`SetLoadoutHandler`**: Verify applying a loadout correctly overrides the aircraft's `CombatComponent` magazines.
- [x] 157. **`FacilityComponent.reserves`**: Verify a base cannot transfer fuel it does not have in `fuelReservesKg`.
- [x] 158. **`UpdateLogisticsStateHandler`**: Verify the command forcefully transitions an entity to a new turnaround phase.
- [x] 159. **`ConsumeFuelHandler`**: Verify the command deducts the exact float amount of fuel and checks for bingo state.
- [x] 160. ****`MobilityKill`**: Verify the destruction of all `Propulsion` subsystems forces engine thrust to 0 permanently.

## 9. Environment & Geography
- [x] 161. **`EnvironmentSystem.terrainHeight`**: Verify `terrainHeightM` matches the Oracle's elevation for the entity's Lat/Lon.
- [x] 162. **`EnvironmentSystem.isGrounded`**: Verify the flag triggers when `TransformComponent.z` drops below the local terrain height.
- [x] 163. **`EnvironmentSystem.isaDensity`**: Verify standard atmosphere calculations drop density correctly up to the 11km tropopause.
- [x] 164. **`EnvironmentSystem.sspThermocline`**: Verify ocean temperature drops rapidly between 100m and 1000m depth.
- [x] 165. **`EnvironmentSystem.sspDeepIso`**: Verify ocean temperature stabilizes at 4°C below 1000m.
- [x] 166. **`EnvironmentSystem.sspSoundSpeed`**: Verify the Mackenzie equation outputs ~1480-1530 m/s based on depth and temperature.
- [ ] 167. **`SetEnvironmentHandler`**: Verify global weather injections (e.g., Rain = 25mm/hr) update the system state.
- [x] 168. **`UpdateEnvironmentCommand`**: Verify the command successfully pushes Oracle data into the local `EnvironmentComponent`.
- [ ] 169. **`Pathfinder.clearPath`**: Verify A* returns a straight line of waypoints if there are no terrain obstacles.
- [ ] 170. **`Pathfinder.obstacleAvoidance`**: Verify A* routes around a mountain peak that exceeds the requested `minAltitude`.
- [x] 171. **`TerrainOracle.interpolation`**: Verify a query exactly between two known grid points returns the precise mathematical average.
- [x] 172. **`TerrainOracle.lineOfSight`**: Verify `isLineOfSightClear` over flat ocean.
- [x] 173. **`TerrainOracle.lineOfSightBlocked`**: Verify it returns false if any sampled midpoint elevation is higher than the raycast altitude.
- [x] 174. **`MapDataService.bathymetry`**: Verify it successfully parses and returns GeoJSON depth lines.
- [x] 175. **`MapDataService.borders`**: Verify it successfully parses and returns GeoJSON political boundary lines.

## 10. Doctrine, AI & Execution
- [x] 176. **`DoctrineSystem.emconActive`**: Verify units in `EMCON: Active` automatically turn their radar components on.
- [x] 177. **`DoctrineSystem.emconSilent`**: Verify units in `EMCON: Silent` automatically turn their radar components off.
- [x] 178. **`WRAExecutorSystem.roeFree`**: Verify the system fires on UNKNOWN contacts if ROE is set to FREE.
- [x] 179. **`WRAExecutorSystem.roeTight`**: Verify the system ONLY fires on confirmed HOSTILE contacts if ROE is TIGHT.
- [x] 180. **`WRAExecutorSystem.roeHold`**: Verify the system never fires autonomously if ROE is HOLD.
- [x] 181. **`WRAExecutorSystem.targetTypeMatch`**: Verify a WRA rule designated for "Air" targets is ignored when evaluating a "Surface" track.
- [x] 182. **`WRAExecutorSystem.rangePercentage`**: Verify a missile is held back until the target closes to the specific `maxRangePct` (e.g., 75% of Rmax).
- [x] 183. **`WRAExecutorSystem.salvoQuantity`**: Verify the system fires exactly N weapons according to the `quantity` parameter in the rule.
- [x] 184. **`WRAExecutorSystem.weaponMatching`**: Verify the system skips mounts that do not contain the specific weapon requested by the WRA rule.
- [x] 185. **`MissionSystem.strike`**: Verify a Strike mission generates a navigation DAG node aiming for the specific target track's position.
- [x] 186. **`MissionSystem.patrol`**: Verify a Patrol mission transitions from Pending to Active and updates the `DoctrineComponent` if required.
- [x] 187. **`SetROEHandler`**: Verify the command successfully overrides a specific unit's local ROE state.
- [x] 188. **`SetSideROEHandler`**: Verify the command recursively updates the ROE for every unit belonging to the specified Side.
- [x] 189. **`SetMissionROEHandler`**: Verify the command updates the ROE for a group leader and all of its subordinates.
- [x] 190. **`UpdateWRARulesHandler`**: Verify pushing a new JSON ruleset overwrites the `wraRules` array in the Doctrine component.
- [x] 191. **`AssignWeaponHandler`**: Verify a manual assignment command locks a specific mount to a specific target ID.
- [x] 192. **`TaskGraph.dependencyCheck`**: Verify a child node remains `Pending` until its parent node achieves `Completed` status.
- [x] 193. **`TaskGraph.failureCascade`**: Verify marking a parent node as `Failed` recursively fails all dependent child nodes.
- [x] 194. **`MinistryOfStrike.evaluate`**: Verify the Ministry correctly extracts the spatial coordinates of a target from the TMS.
- [x] 195. **`MinistryOfPatrol.evaluate`**: Verify the Ministry correctly declares a spatial area as the objective.
- [x] 196. **`LoadoutRegistry.get`**: Verify an aircraft can query available profiles mapped to its platform class.
- [x] 197. **`EntityManager.spawn`**: Verify hydration successfully maps JSON profile blueprints into a living `Entity` with instantiated components.
- [ ] 198. **`ScenarioLoader.manifest`**: Verify passing a `ScenarioManifest` successfully loops and spawns all requested entities.
- [ ] 199. **`WeaponProfileRegistry.effectiveRange`**: Verify the static Rmax calculation incorporates the aerodynamic altitude bonus correctly.
- [ ] 200. **`FireWeaponHandler`**: Verify the explicit `FireWeaponCommand` bypasses WRA rules entirely and forces the mount to expend ordnance.


Here is your Level 2 (Integration) testing checklist. 

While unit tests run purely in memory, these integration tests verify that your "glue" works—specifically the boundaries between your client (`CommandBus`, `UIStore`), your gateway (`GatewayServer`, WebSocket protocols), and your core engine (`MatchService`, `World`).

### 📡 1. Connection & Session Management
*Tests the boundary between a WebSocket client, the GatewayServer, and the SessionManager.*

- [ ] **Client Connection:** Connect a mock WebSocket client to the `GatewayServer` and verify a unique session ID is generated in `SessionManager`.
- [ ] **Match Joining:** Send a `JOIN_MATCH` message and verify the session is updated with the correct `matchId` and `Side`.
- [ ] **Initial Hydration:** Verify that immediately after a successful `JOIN_MATCH`, the server pushes an initial `VIEW_STATE` snapshot to the client.
- [ ] **Heartbeat Timeout:** Simulate a client that connects but drops all `ping` requests, and verify the server forcefully terminates the connection after `config.heartbeatIntervalMs`.
- [ ] **Clean Disconnect:** Close the WebSocket connection cleanly and verify `SessionManager.removeSession()` is called, preventing memory leaks.

### 🛡️ 2. The Command Pipeline
*Tests the flow of commands from the client, through the server validation, into the engine's queue.*

- [ ] **Valid Command Routing:** Send a valid `ISSUE_COMMAND` payload (e.g., `SetCourse`) and verify it successfully appears in `World.externalCommandQueue`.
- [ ] **Side Isolation Enforcement:** Authenticate as `Side.Blue`, send a command targeting a `Side.Red` entity, and verify the server rejects it and returns a `COMMAND_ACK` error.
- [ ] **Malformed Payload Handling:** Send an invalid JSON string to the WebSocket and verify the server catches the error and returns a generic `ERROR` message without crashing.
- [ ] **Invalid Command Type:** Send an `ISSUE_COMMAND` with an unknown command type and verify `CommandFactory` returns undefined, resulting in a `COMMAND_ACK` failure.
- [ ] **Command Parsing Accuracy:** Verify `CommandFactory` correctly translates flat JSON parameters (e.g., `speedKts`) into their respective Engine V3 Command class instances.

### 📦 3. Binary Compression & Protocol (`DeltaEncoder` / `DeltaDecoder`)
*Tests the critical path for handling 10,000+ units by verifying serialization integrity.*

- [ ] **Binary Round-Trip (Units):** Pass a `ViewStateSnapshot` with complex units (navigation targets, sensor masks) into `DeltaEncoder`, decode it with `DeltaDecoder`, and assert exact data parity.
- [ ] **Binary Round-Trip (Tracks):** Encode and decode a snapshot containing `Tracks` with different classifications, ensuring the string-to-integer mapping (e.g., 'Hostile' -> 2) resolves correctly on both ends.
- [ ] **Size Reduction Verification:** Assert that the byte length of an encoded binary snapshot is strictly smaller than `Buffer.from(JSON.stringify(snapshot))`.
- [ ] **Padding & Offset Safety:** Test encoding an entity with missing optional data (e.g., no sensors) and verify the decoder reads the exact 32-byte block without shifting subsequent units.

### ⏱️ 4. Time Compression & Sync
*Tests how the server dictates the flow of time to both the engine and the UI.*

- [ ] **Pause Execution:** Send a `SET_TIME_COMPRESSION` message with `rate: 0` and verify `world.isPaused` becomes true and the `tickInterval` skips processing.
- [ ] **Forced Resolution on Pause:** Verify that if the engine is paused, sending a new `ISSUE_COMMAND` forces an immediate `tickAll(0)` to resolve the command without advancing game time.
- [ ] **Time Acceleration:** Send `SET_TIME_COMPRESSION` with `rate: 5` and verify the `MatchService` scales the `dt` parameter passed to `world.tick()` accordingly.
- [ ] **Pause State Broadcast:** Verify that pausing the server forces an immediate out-of-band `VIEW_STATE` broadcast so connected clients instantly reflect the paused state.

### 💾 5. Scenario & Database I/O
*Tests the server's ability to interface with the file system and global services.*

- [ ] **HTTP Profile API:** Hit the `/api/database/profiles` GET endpoint and verify it returns a valid JSON array of loaded DB3000 profiles.
- [ ] **Scenario Export:** Dispatch an `EXPORT_SCENARIO` WebSocket message and verify the server returns a `SCENARIO_EXPORTED` payload containing a valid serialization of the `globalWorld`.
- [ ] **Scenario Import:** Dispatch an `IMPORT_SCENARIO` message with a valid JSON world payload and verify `MatchService` successfully replaces `globalWorld` and restarts the tick loop.
- [ ] **Import Error Handling:** Dispatch an `IMPORT_SCENARIO` with a corrupted payload and verify the server catches the error, does not replace the active world, and returns an `ERROR` message.

### 💻 6. Client-Side State Hydration (`CommandBus` & `UIStore`)
*Tests how the frontend handles data pushed from the server.*

- [ ] **Snapshot Ingestion:** Dispatch a mock `VIEW_STATE` payload into the client's WebSocket receiver and verify `UIStore.viewState` updates accurately.
- [ ] **Sequence Ordering:** Send a `VIEW_STATE` with `sequence: 10`, then immediately send one with `sequence: 9`, and verify `UIStore` discards the stale packet.
- [ ] **Event Logging:** Trigger an `EVENT` message from the server (e.g., "Unit Destroyed") and verify it correctly appends to the `UIStore.logs` array.
- [ ] **Authoritative Pause Handshake:** Verify that when the UI requests a pause, `UIStore.isPaused` updates locally, but waits for the server's next `VIEW_STATE.isPaused` flag to confirm the transition.

Here is your Level 3 (End-to-End Scenario) testing checklist.

### 🌍 1. The "Cold Start" (Server Initialization)
*Tests the integrity of the `Server` and `MatchService` immediately upon startup.*

- [ ] **Port Binding:** Start the server and verify it successfully binds to port `config.websocketPort`.
- [ ] **Profile Loading:** Verify the `globalDB3000` is populated and `MatchService.loadProfileData` successfully registers weapon profiles.
- [ ] **World Bootstrapping:** Verify `globalWorld` is instantiated with a proper origin (if provided) and the correct initial tick state.
- [ ] **Command Handler Registration:** Verify the `CommandDispatcher` is fully populated with all 19 standard command handlers upon server start.

### 🎯 2. The "Hot Launch" (Client Interaction)
*Tests the full lifecycle of a single unit from the client's perspective.*

- [ ] **Entity Creation:** Send `IMPORT_SCENARIO` or `SPAWN_GROUP` with a simple aircraft payload, and verify a new `Entity` appears in `globalWorld.entities`.
- [ ] **State Synchronization:** Immediately after spawning, verify the client receives a `VIEW_STATE` broadcast where the new entity has `position: [0,0,0]` and heading `[1,0,0]`.
- [ ] **Movement Execution:** Send an `ISSUE_COMMAND` (`SetCourse`) to the new entity, verify the engine processes it, and confirm the next `VIEW_STATE` shows the entity has moved.
- [ ] **Visual Feedback:** Verify that on the client UI, the new unit icon moves smoothly from the origin point across the 2D map as time progresses.

### 💣 3. The "Kill Chain" (Combat Simulation)
*Tests the complete end-to-end weapon engagement.*

- [ ] **Target Acquisition:** Spawn a friendly unit and a hostile unit. Verify the friendly unit's `SensorSystem` detects the hostile and updates its `detectedEntities` mask.
- [ ] **Weapon Allocation:** Send a command for the friendly unit to acquire and lock the hostile target. Verify the `WeaponSystem` assigns a `weaponProfileId`.
- [ ] **Ballistic Solution:** Verify the friendly unit fires (or automatically launches) a missile. Check server logs to confirm `FireControl.calculateBallisticSolution` returns a valid `TOF` (Time of Flight).
- [ ] **Impact & Damage:** Verify that after the `TOF` elapses, the missile collides with the target, and the target entity receives a `DamageEvent` or `DestroyEntity` command.
- [ ] **Confirmation:** Verify the hostile entity's health drops below zero, it is removed from the `globalWorld`, and the client receives a `VIEW_STATE` update reflecting its absence.

### 💥 4. Complex Scenario (Multi-Group Engagement)
*Tests the server's ability to handle load and multiple actors simultaneously.*

- [ ] **Mass Spawn:** Import a scenario with 5 friendly and 5 hostile units on each side.
- [ ] **Distributed Conflict:** Verify that friendly forces spread out (clustering/separation) and hostile forces maintain formation/maneuver.
- [ ] **Sensor Network:** Verify that a "Leader" unit can detect a target and relay that information to wingmen via the sensor mask.
- [ ] **Simultaneous Attacks:** Verify that the engine can process 10+ weapon launches within the same tick interval without crashing.
- [ ] **Final State Verification:** After the scenario runs, verify that the number of remaining entities matches the expected survivors based on the initial setup.

### 🛑 5. Time & State Management
*Tests the control mechanisms of the simulation.*

- [ ] **Pause/Resume:** Send `SET_TIME_COMPRESSION { rate: 0 }`. Verify engine ticks stop. Send `SET_TIME_COMPRESSION { rate: 1 }`. Verify engine ticks resume.
- [ ] **Instant Resolution:** While paused, send a command to move a unit. Verify the unit moves instantly to the new position in the next `VIEW_STATE` (no time passes).
- [ ] **Export/Import Cycle:** Export the current world state. Stop the server. Start the server again. Import the saved world. Verify the engine state (positions, munitions, teams) is identical to the point of export.

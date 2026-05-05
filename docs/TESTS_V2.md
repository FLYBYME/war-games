Here is the complete, exact list of every test case extracted directly from the V2 test files you provided. There are 316 individual `it()` blocks across the test suites. 

### Core Engine & Infrastructure (`engine/`)
**SimulationRuntime.test.ts**
1. should orchestrate the full pipeline during a tick
2. should periodically trigger snapshots
3. should boot by loading the scenario and attaching telemetry

**ProfileRegistry_Ext.test.ts**
4. validates profiles on registration
5. tracks property access through proxies
6. can clear registered profiles
7. can check if a profile exists

**TrackBuffers.test.ts**
8. allocates the team track layout at the configured capacity with defaults
9. clears one team track slot back to defaults
10. allocates the local track layout at the configured capacity with defaults
11. clears one local track slot including engagement and category fields

**WorldBuffer.test.ts / WorldBuffer_Core.test.ts**
12. should allocate arrays based on schema metadata
13. should support SharedArrayBuffer for multi-threaded access
14. should correctly clear data for recycled slots
15. should provide direct access to the individual buffers
16. should dynamically allocate all buffers from SCHEMA
17. should initialize with default values from SCHEMA
18. should clear an indexed slot while preserving generation
19. should support SharedArrayBuffer if requested
20. should provide direct access via getBuffer

**EntityManager.test.ts / EntityManager_Ext.test.ts**
21. hashes strings correctly
22. infers medium correctly
23. infers category correctly
24. spawns with hosted units recursively
25. spawns formation
26. handles projection in spawn
27. handles ballistic flight and coastOnBurnout
28. handles multi-stage weapon stages and seeker
29. destroys children recursively
30. parses arcs correctly
31. should spawn an entity with raw Cartesian coordinates
32. should resolve WGS84 coordinates if projection is available
33. should handle parent-child relationships
34. should assign a default teamId of 0 if not specified
35. should refuse to spawn if buffer is full

**Engine.test.ts / Engine_Ext.test.ts / Engine_Infrastructure.test.ts**
36. has a profile registry
37. can apply environment profiles
38. handles scenario loading with sides
39. handles scenario centers and reference points
40. can register units from profiles
41. tracks dirty flags correctly
42. calculates state hashes
43. can reset metrics
44. handles parent-child destruction
45. initializes and clears (TrackBuffer)
46. initializes and clears (LocalTrackBuffer)
47. validates a simple scenario
48. projects and unprojects
49. produces consistent values
50. manages thermal layers
51. creates open ocean
52. initializes with a world buffer
53. can spawn an entity and tick
54. loads standard profiles

**TileManager.test.ts**
55. should load a tile when requested for the first time
56. should return cached tiles immediately without calling loader again
57. should support eviction of unused tiles

**ECSRegistry.test.ts**
58. allocates, frees, and recycles entity IDs while clearing reused state
59. writes numeric schema properties into buffers and applies dirty flags
60. stores object-backed properties and exposes them through the entity proxy
61. tracks detection bitsets and name-based lookup helpers
62. captures snapshots and binary state for alive entities only

**TerrainOracle.test.ts / Terrain.test.ts**
63. samples elevation
64. returns metadata
65. samples elevation via oracle

**LocalCommandGateway.test.ts**
66. dispatches orders directly to the engine
67. supports legacy submitOrder name

**WgtFormat.test.ts**
68. should encode and decode a tile with zero precision loss
69. should throw error on invalid magic number
70. should support SharedArrayBuffer for zero-copy workers

**GeoProjection.test.ts**
71. should project origin to (0,0,0)
72. should calculate accurate distances (East)
73. should calculate accurate distances (North)
74. should handle unprojection (Round-Trip)
75. should account for Earth curvature drop at distance

**metaRegistry.test.ts**
76. includes runtime and core metadata entries in the consolidated schema
77. returns exact metadata for a valid key and throws for unknown keys
78. defines complete track schemas with expected defaults for truth references

**FixedStepTicker.test.ts**
79. should trigger exactly the expected number of ticks for a given duration
80. should handle "Spiral of Death" by capping the accumulator
81. should support manual stepping for testing/debugging
82. should maintain a deterministic dt regardless of wall-clock jitter

**Systems_Ext.test.ts**
83. handles weapon system allocations
84. handles formation stations

---

### Multi-Tenant Server & Services (`server/`)
**OOBService.test.ts**
85. should get OOB entities
86. should update entity loadout
87. should update entity kinematics
88. should update faction doctrine

**ECSRegistry_Security.test.ts**
89. should provide ground truth for friendly units
90. should provide sensor-degraded data for hostile units (Firewall Active)
91. should not include undetected hostile units in binary state

**StagingService.test.ts**
92. should create a lobby
93. should lock a lobby
94. should launch a match from a lobby
95. should delete a lobby

**SimulationServer.test.ts**
96. manages active match sessions and world buffers
97. submits orders to the correct worker thread
98. recovers matches after worker failure (Bare-Metal V2 Fault Tolerance)

**ScenarioService.test.ts**
99. should list scenarios with basic info
100. should get a scenario
101. should save a scenario
102. should delete a scenario

**JobService.test.ts**
103. should create and track a Monte Carlo job
104. should cancel a processing job
105. should list all jobs

**MatchService_Ext.test.ts**
106. should initialize and emit simulation events
107. should expose match and worker counts
108. should manage match lifecycle (pause/resume/destroy)

**AuthService.test.ts**
109. should login and create a session
110. should retrieve an active session
111. should not retrieve an expired or invalid session
112. should create and validate a one-time ticket
113. should logout and invalidate the session
114. should fail to create a ticket for an unauthorized session

**ProfileService.test.ts**
115. should list profiles in a category
116. should get a profile by id
117. should throw NotFoundError if profile does not exist
118. should save a profile
119. should delete a profile

---

### V2 Engine Systems (`systems/`)
**BehaviorSystem.test.ts**
120. initializes

**CombatSystem.test.ts**
121. selects nearest hostile track when in FREE posture
122. respects salvo size from WRA doctrine
123. emits Winchester event when out of ammo

**HealthSystem.test.ts**
124. destroys entity when HP <= 0
125. applies crush depth damage with HP-based depth reduction
126. applies G-load structural damage
127. applies Mach-limit thermal/structural damage
128. disables specific components when component-health is depleted

**EWSystem.test.ts**
129. detects emitters and emits SpikeSearch events
130. deploys chaff decoys when requested
131. deploys flare decoys when requested

**WaypointSystem.test.ts**
132. steers entity towards waypoint
133. reaches waypoint and advances to next
134. emits RouteCompleted when last waypoint reached
135. respects waypoint speed
136. skips dead entities

**KinematicsSystem.test.ts**
137. initializes

**SensorSystem.test.ts**
138. detects via Active Radar
139. respects beam width for rotating sensors
140. detects via Visual/Optical
141. detects via Sonar
142. handles track timeout and contact lost
143. detects sub masts at periscope depth

**WeaponStageSystem.test.ts**
144. advances stages and applies kinematics
145. handles coastOnComplete
146. spawns Kill Vehicle at final stage completion
147. skips non-weapons or dead entities

**MissionSystem.test.ts**
148. initializes

**DoctrineSystem.test.ts**
149. enforces EMCON levels and respects overrides
150. enforces weapon posture based on ROE

**FlightDeckSystem.test.ts**
151. manages full launch lifecycle: ready -> queue -> launch
152. respects launch rate limiting
153. blocks launch when deck capacity is reached
154. handles recovery lifecycle
155. stops operations when carrier is destroyed

**CollisionSystem.test.ts**
156. destroys aircraft and weapons on water impact
157. allows torpedoes to enter water if speed is below threshold
158. triggers proximity detonation and damages target

**MountSystem.test.ts**
159. initializes

**TMSSystem.test.ts**
160. queues and processes detections

**CommSystem.test.ts**
161. segments nodes into subnets based on network ID and team
162. breaks links when jamming noise exceeds sensitivity
163. builds subnets and synchronizes tracks
164. handles link failure and comms lost event

**FormationSystem.test.ts**
165. maintains relative station
166. drops formation if guide is dead

**GuidanceSystem.test.ts**
167. steers missile toward target using PN

**RefuelingSystem.test.ts**
168. processes fuel transfer when in range
169. rejects weapons from refueling
170. respects tanker maximum transfer capacity
171. prevents cross-domain refueling (Air vs Surface)

---

### Regressions (`regressions/`)
**AI_Doctrine.test.ts**
172. 71. BVR Intercept: AI fires missile when target enters prosecution zone
173. 72. Evasive Maneuver: AI pulls high-G when missile is detected in pitbull mode
174. 73. Bingo Fuel: AI returns to base when fuel is below reserve
175. 74. Formation Keeping: Wingman maintains offset from leader
176. 75. Tanker Rendezvous: AI maneuvers to tanker refuel position
177. 76. EMCON Silence: AI disables active sensors when emconMode is SILENT
178. 77. TWS Multi-track: Radar tracks multiple targets without hard lock
179. 78. Coop Engagement: Shared track allows launch from platform without radar
180. 79. Countermeasure Auto-deploy: AI drops flares when missile is within 5km
181. 80. SEAD: AI prioritizes targets with active radar emissions
182. 81. CAP Patrol: AI maintains station within assigned radius
183. 82. Escort Logic: Fighter maintains position ahead of high-value asset
184. 83. Strike Ingress: AI descends to low altitude when entering threat zone
185. 84. RTB State: AI proceeds to home base after mission completion
186. 85. Winchester Auto-RTB: AI returns to base when winchesterSent is 1

**BallisticPhysics.test.ts**
187. 1. The Apogee Contract (The Parabola Test)
188. 2. The Flight Control Rejection (The "No Flying" Test)
189. 3. The Thrust Starvation Contract (The Unpowered Test)
190. 4. The Ground Impact Resolution (The Termination Test)
191. 5. The Kinematic Speed Constraint (The Muzzle Velocity Test)

**Sensors_EW.test.ts**
192. 81. Radar SNR Distance Law: SNR decreases by 40 log10(R)
193. 82. Stealth RCS Aspect: F-22 has lower RCS from front than side
194. 83. Jamming Burn-Through: Radar detects target despite jamming at close range
195. 84. Chaff Effectiveness: Missile loses lock when chaff is deployed
196. 85. ESM Triangulation: Multiple sensors locate emitter
197. 86. Radar Horizon: Low-flying targets are masked by the earth's curvature
198. 87. Atmospheric Absorption: Rain reduces radar detection range
199. 88. IRST Detection: Infrared sensors detect targets based on heat signature
200. 89. Doppler Notch: Radar loses track of target moving perpendicular to beam
201. 90. Multi-static Radar: Detection using transmitter and receiver at different locations
202. 91. Laser Rangefinder: Accuracy within 1m at close range
203. 92. ESM Identification: System identifies target based on emitter frequency
204. 93. Flare Rejection (ECCM): Advanced seeker ignores flare decoys
205. 94. Home-On-Jam: Missile switches to passive tracking when jammed
206. 95. Towed Decoy: Missile locks onto decoy instead of parent platform

**Aerodynamics_Flight.test.ts**
207. 13. Combat Speed Validation: Gen5 fighter achieves at least 250 m/s
208. 14. Altitude Drag Decay: drag decreases at higher altitudes
209. 15. Level Flight Lift: Maintenance of altitude
210. 16. Glide Ratio Mechanics: disabled engines result in realistic glide ratio
211. 17. Kinetic Bleed on Maneuver: 9G turns bleed airspeed
212. 18. Mass vs. Acceleration: heavy bombers accelerate slower
213. 21. High-Speed Flutter: Aircraft takes structural damage above Mach 2.5
214. 22. Altitude Performance: Engine thrust decreases with air density
215. 23. Crosswind Crab: Wind component affects ground track
216. 24. Landing Gear Drag: Deploying gear increases parasite drag
217. 25. Ground Effect: Lift increases when within one wingspan of surface
218. 61. Transonic Drag Spike: Drag increases significantly at Mach 1
219. 62. Fuel Burn Acceleration: Acceleration increases as mass decreases
220. 26. Mach Tuck: Pitch down tendency at Mach 1.0
221. 27. Hypersonic Thermal Limit: Damage at speeds > 2000 m/s
222. 28. Service Ceiling: Engines flame out at 30km

**MissileKinematics.test.ts**
223. 41. Missile Max Range: Weapon self-destructs after exceeding fuel/burn duration
224. 42. Proximity Fuse: Missile detonates when target is within lethal radius
225. 43. High-Speed Impact: Mach 4.5 missile correctly hits target despite high per-tick displacement
226. 44. Countermeasure Decoys: Missile target switches to nearest decoy
227. 45. Fuel Burn Dynamics: Thrust stops after fuelKg reaches zero
228. 48. Proportional Navigation: Missile lead angle calculation
229. 49. Seeker FOV Limit: Missile loses target off-bore
230. 50. Data-link Update: Missile receives external guidance
231. 51. Terminal Dive: Anti-ship missile pitches down for impact
232. 52. Waypoint Nav: Missile follows complex path
233. 53. LOAL: Missile finds target after mid-air launch
234. 54. EO/IR Seeker: Missile detects hot target
235. 55. Wake Homing: Torpedo follows ship wake

**NavalDynamics.test.ts**
236. 51. Submarine Buoyancy: positive buoyancy leads to surfacing when stationary
237. 52. Pressure Hull Failure: Crush depth triggers catastrophic HP loss
238. 53. Cavitation Threshold: high-speed subsurface travel increases acoustic signature
239. 54. Surface Wave Drag: ship speed is limited by hull length (Froude number)
240. 55. Active Sonar Ping: active sonar increases detectability of the source
241. 56. Variable Depth Sonar (VDS): Sonar below thermocline detects deep targets
242. 57. Torpedo Wire Guidance: Torpedo receives updates from parent until wire break
243. 58. Thermal Layers: Submarine is masked when hiding below the layer
244. 59. Passive Sonar Detection: Submarine detects noisy ship
245. 60. MAD Detection: P-3 Orion detects submarine at close range
246. 61. Battery Exhaustion: Submarine must surface when batteries are drained
247. 62. Snorkel Detection: Sub at surface is more detectable than deep
248. 63. Sinking Velocity: Ship with 0 HP descends at terminal sinking speed
249. 64. Hull Integrity: Damaged subs have reduced crush depth
250. 65. Hydrodynamic Noise: Ship noise scales with speed

**HighFidelity_Architectural.test.ts**
251. 1. Fired weapons must decouple from parent lifecycle (The "Telepathic Missile" Fix)
252. 2. Entity metadata must be strictly purged on destruction (The "ID Recycling" Fix)
253. 3. Tankers must strictly reject Weapon entities for refueling (The "Refueling Missiles" Fix)
254. 4. Refueling must enforce Traversal Medium matching (Cross-Domain Fix)
255. 5. Flight Control PID must ignore non-aviation entities (The "Flying Submarine" Fix)
256. 6. Radar horizon must enforce a minimum mast height for surface units (The "Clamped Zero" Fix)
257. 7. Subsystem degradation must be time-scaled, not tick-scaled (The "Suicidal Damage" Fix)
258. 8. State changes must use Edge Triggers to prevent event spam (The "Continuous Cavitation" Fix)
259. 9. Behavior Systems must be blind to ground-truth physics
260. 10. Spawners must loudly reject missing required schemas

**ECS_ObjectPooling.test.ts**
261. 1. Entity Recycling: ensure IDs are reused after destruction
262. 2. Reset on Reuse: position [0,0,0] is restored for pooled entities
263. 3. Buffer Isolation: properties of ID:1 do not bleed into ID:2
264. 4. Event Cleanup: Listeners are purged when an entity is destroyed
265. 5. Winchester State Reset: ensures b.winchesterSent is cleared on reuse
266. 6. Registry Clear: all entities are removed and buffers wiped
267. 7. Metadata Hydration: entity pulls values from profile object
268. 8. Multi-buffer Sync: Changing pos marks Kinematics dirty
269. 9. Max Entities Limit: engine throws or handles overflow
270. 10. Parent-Child Destruction: Removing parent removes all children
271. 11. Multi-team isolation: findByTeam returns correct sets
272. 12. Component bitmask reset: dirty flags are cleared per tick
273. 13. Registry reuse fragmentation: ensuring long sequences of spawn/free stay stable
274. 14. Mass buffer initialization: mass is correctly set to sum of dry + fuel
275. 15. Entity Count Accuracy: registry maintains correct active count
276. 16. Generation Increment: generations increase on recycle

**Serialization_Perf.test.ts**
277. 91. Binary Round-trip: Entity state persists through JSON serialization
278. 92. State Hash Consistency: Deterministic seeds produce identical hashes
279. 93. Performance: 1000 entities processed within 10ms tick budget
280. 94. Binary Delta Encoding: Only changed entities are included in delta state
281. 95. Memory Stability: Entity recycling does not leak IDs
282. 96. State Compression: Snapshot binary size is optimized
283. 97. Tick Determinism: Different tick sizes (0.1s x 10 vs 1.0s) produce similar results
284. 98. System Order Independence: Systems can be registered in any order and still work
285. 99. Snapshot Integrity: Snapshot contains all vital buffers
286. 100. Monte Carlo Convergence: Averaged results across 100 runs are stable

---

### Architectural / Core Re-Verifications (`architectural/`)
**Sensors.test.ts**
287. 21. Surface Vessel Radar Horizon
288. 22. Active Radar EMCON Alpha Silence
289. 23. Noise Jamming Sensitivity Floor
290. 24. Decoy Signature Hijacking
291. 25. Passive Sonar Convergence Zone
292. 26. IR Signature Altitude Scaling
293. 27. ESM Directional Ambiguity
294. 28. Radar Cross Section Aspect Dependency
295. 29. Sonar Self-Noise Speed Penalty
296. 30. Terrain Masking Rejection

**Physics.test.ts**
297. 11. Submarine Aerodynamic Immunity
298. 12. Ballistic Projectile Flight Control Immunity
299. 13. Unpowered Ballistic Drag
300. 14. Fuel Starvation Flameout
301. 15. Max Turn Rate Clamping
302. 16. Max Speed Clamping
303. 17. Submarine Dive Rate Clamping
304. 18. Ground Impact Detonation
305. 19. RK4 vs Euler High-G Precision
306. 20. Stage Separation Coasting

**Lifecycle.test.ts**
307. 1. Parent-Child Collision Immunity
308. 2. Fired Weapon Decoupling
309. 3. Total Metadata Purge on Destruction
310. 4. Naval Z-Axis Clamping
311. 5. Air Z-Axis Bump
312. 6. Submarine Safety Depth Bump
313. 7. Malformed JSON Rejection
314. 8. Mass Calculation Integration
315. 9. TaskGraph Allocation
316. 10. Entity Category Inference
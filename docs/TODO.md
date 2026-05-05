# War-Games V3: "Pro Edition" Roadmap

This document outlines the architectural and logic gaps required to reach 100% feature parity with the "Pro Edition" specification. Focus is on **Server-Side Engine Maturity** to support existing UI layers.

---

## 1. Doctrine & Tactical Automation (The "Brain")
- [x] **WRA Executor System**: Implement server-side logic to evaluate `WRARule` arrays from `DoctrineComponent`. Auto-fire weapons when targets meet criteria (type, range, count).
  - *Blocks*: `WRAEditor.ts` (currently dispatches rules to a no-op handler).
- [x] **ROE/Doctrine Propagation**: Handle `SetSideROECommand` by batch-updating all units on a specific side.
  - *Blocks*: `DoctrineROEPanel.ts` (dispatches `SetGlobalROE`/`SetMissionROE` with no server-side fan-out).
- [x] **Mission AI (A\*)**: Replace the stub in `Pathfinder.ts:55` (`// TODO: Implement actual A* branching/search here`) with a real A* search on the terrain/threat grid.
  - *Blocks*: `MissionSystem.ts`, `ScenarioManager.ts`.
- [x] **`SetSensorState` Command Handler**: Wire `CommandFactory` to accept `SetSensorState` and toggle the matching sensor in `SensorComponent`. Currently dispatched by `EMCONMatrix.ts` but never consumed.
- [x] **`AssignWeapon` Command Handler**: Wire `CommandFactory` to accept `AssignWeapon` and set mount-to-target bindings in `CombatComponent`. Currently dispatched by `WeaponAllocationMatrix.ts` but never consumed.

## 2. Logistics & Sustainability
- [x] **Resource Transfer Resolver**: Implement logic in `World.ts` to subtract/add fuel and ammo during `TransferResourcesCommand`.
  - *Blocks*: `LoadoutConfigurator.ts`.
- [x] **Dynamic Fuel & Bingo**: `PropulsionSystem` must calculate `BurnRateKgHr` and `BingoTicks` based on distance to `currentBaseId`. Expose `fuelPct` and `isBingo` in `ViewStateSystem` unit snapshots.
  - *Blocks*: `FuelBingoDashboard.ts` (currently uses `Math.random()` — no real fuel data in `ViewState`).
- [x] **Loadout Hot-Swapping**: Implement `SetLoadout` command to rebuild `CombatComponent` magazines from `ProfileRegistry`.
  - *Blocks*: `LoadoutConfigurator.ts` (dispatches `SetLoadout` with no server-side handler).

## 3. High-Fidelity Physics & Nav
- [x] **TOT (Time Over Target) Engine**: `NavigationSystem` needs to calculate required speed to hit specific waypoints at specific ticks. Expose active waypoints and required speeds in `ViewState`.
  - *Blocks*: `TOTCalculator.ts` (currently uses static fake strike rows, not bound to real unit waypoints).
- [x] **Formation System**: Implement a persistent `FormationSystem` that maintains relative offsets (Δx, Δy, Δz) and applies correction forces to wingmen. Add `SetFormation` command dispatch to `FormationEditor.ts`.
  - *Blocks*: `FormationEditor.ts` (canvas-only visual with no command dispatch; pixel offsets not converted to world-space metres).
- [x] **Force-Based Steering**: Link `SetHeading` and `SetAltitude` to PID controllers that output to `netForce` rather than teleporting. Fix placeholder thrust in `CommandFactory.ts:61,90`.

## 4. Electronic Warfare & Networking
- [x] **Datalink Topology Engine**: `DatalinkSystem` must output its internal connectivity graph (Nodes/Edges/Latency) to `ViewState`.
  - *Blocks*: `DatalinkTopology.ts` (uses `Math.random() > 0.15` for connectivity — no real graph in `ViewState`).
- [x] **Environmental Attenuation**: Integrate `EnvironmentSystem.precipitation` into `SensorSystem` SNR calculations (Radar/Sonar/ESM). Fix `SensorSystem.ts:218` SOJ jammer-beam check stub.
  - *Blocks*: `WeatherInjector.ts` (dispatches `SetEnvironment` but attenuation not applied in `SensorSystem`).
- [x] **ViewState Envelope Generation**: Backend must calculate Radar Horizon and Weapon Coverage polygons (accounting for terrain masking). Expose per-unit `sensorRange` and `wezRadius` in `ViewState`.
  - *Blocks*: `SensorArcsLayer` (hardcoded 120 km/60° arc for all units), `RadarRingsLayer` (hardcoded 200 km), `WEZLayer` (hardcoded 150 km), `ThreatEnvelopeLayer` (hardcoded SAM/point-defence radii).
- [x] **Track Classification Inference**: `TrackManagementSystem.ts:66` has `// TODO: Infer from target components`. Populate `classification` from the target entity's domain/type components.

## 5. Persistence & Telemetry
- [x] **Scenario Service**: Implement `Save/Load` handlers in `GatewayServer` using `World.toJSON()` / `World.fromJSON()`.
  - *Blocks*: `ScenarioManager.ts` (static hardcoded scenario list; Load button is a no-op; Export writes metadata only, not full world state).
- [x] **Losses/Scoreboard Telemetry**: `TelemetrySystem` must track per-side losses (point values of destroyed units) and expose them in `ViewState`.
  - *Blocks*: `LossesGraph.ts` (uses `vs.tracks.length` as placeholder for red losses — no real loss data in `ViewState`).

## 6. ViewState Completeness (UI Data-Binding Gaps)

These UI components render correctly but rely on **hardcoded or simulated data** because the corresponding fields are missing from `ViewStateSystem` snapshots. Each item requires a backend field addition followed by a UI binding update.

- [x] **Fuel Fields in Unit Snapshot**: Add `fuelPct: number` and `isBingo: boolean` to `ViewStateSystem` unit objects (from `LogisticsComponent`).
  - *Blocks*: `FuelBingoDashboard.ts`.
- [x] **Datalink Graph in ViewState**: Add `datalinkGraph: { nodes: string[]; edges: {a:string;b:string;latencyMs:number}[] }` to snapshot.
  - *Blocks*: `DatalinkTopology.ts`.
- [x] **Losses Object in ViewState**: Add `losses: { blue: number; red: number; munitionsExpended: number }` to snapshot (sourced from `TelemetrySystem`).
  - *Blocks*: `LossesGraph.ts`.
- [x] **Weather State in ViewState**: Serialize `EnvironmentSystem` state (precipitation, cloud cover, sea state, wind, visibility, temperature) into the snapshot.
  - *Blocks*: `WeatherOverlayLayer` (hardcoded storm cell positions), `ThermalLayersOverlay` (hardcoded thermal bands), `WeatherInjector.ts` (sliders dispatch but UI never reflects confirmed state).
- [x] **Per-Unit Sensor Envelopes in ViewState**: Add `sensors: { name:string; rangeM:number; azimuthDeg:number; halfArcDeg:number; active:boolean }[]` per friendly unit (from `SensorComponent`).
  - *Blocks*: `SensorArcsLayer`, `EMCONMatrix.ts` (hardcoded AN/SPY-1D sensor list — not read from selected entity's real `SensorComponent`).
- [x] **Weapon Coverage Polygons in ViewState**: Add per-unit `wezPolygon` (radar horizon + weapon range, terrain-masked).
  - *Blocks*: `ThreatEnvelopeLayer`, `WEZLayer`.
- [x] **Weapon-to-Target Bindings in ViewState**: Add `weaponBindings: { weaponId:string; targetId:string }[]` to snapshot (from `CombatSystem` active engagements).
  - *Blocks*: `WeaponTracksLayer` (uses `logState.includes('missile')` + first track as fallback), `EngageTethersLayer` (links every unit to every track).
- [x] **ESM Bearing Lines in ViewState**: Add `esmBearings: { observerId:string; bearingDeg:number; confidencePct:number }[]` (from `SensorSystem` passive-only detections).
  - *Blocks*: `ESMBearingsLayer` (currently draws a line from every friendly to every track regardless of detection state), `EWStrobesLayer`.
- [x] **Real Mount List in ViewState**: Add `mounts: { id:string; type:string; roundsRemaining:number }[]` per friendly unit (from `CombatComponent`).
  - *Blocks*: `WeaponAllocationMatrix.ts` (hardcoded Mk41/Mk45/CIWS rows not bound to the selected entity's real mounts).
- [x] **Bathymetry & Border Data**: Load real GeoJSON bathymetry contours and EEZ boundary lines from `data/` and pass them through the scenario loader into the UI.
  - *Blocks*: `DepthContoursLayer` (placeholder concentric rings), `BordersLayer` (6-point hardcoded EEZ line).
- [x] **LOS Shading from Terrain**: `ViewStateSystem` (or a dedicated terrain service) must compute LOS occlusion polygons per unit from the terrain heightmap.
  - *Blocks*: `LOSShadingLayer` (shadow wedge opposite heading — no terrain query).

## 7. Infrastructure & Performance
- [x] **Delta Compression (V3 Scale)**: Shift from full JSON snapshots to binary delta updates for `VIEW_STATE`. Must support 10,000+ entities without saturating 100 Mbps links.
- [x] **Heartbeat Resilience**: Finalize the "Zombie Connection" cleanup logic in `GatewayServer`. (Partially Done).
- [ ] **Sensor Fidelity**: Implement probabilistic detection (Pd) curves and weather-based SNR attenuation in `SensorSystem`.

## 8. Testing & Reliability
- [ ] **E2E Coverage Expansion**: Implement the remaining 90+ test cases outlined in `UNIT_TESTS_V3.md`.
- [ ] **Stress Testing**: Benchmark `GatewayServer` and `MatchService` with 10,000 active entities.
- [ ] **State Persistence**: Implement `World.serialize()` and `World.deserialize()` for scenario save/load.

## 9. UI/UX Polish
- [ ] **Symbology (MIL-STD-2525D)**: Implement full SVGs for standard tactical icons across all domains (Air, Surface, Subsurface).
- [ ] **Inspector Popouts**: Implement the `DetachableWindow` logic to allow panels to be moved to secondary monitors.
- [ ] **Tactical Dark Theme**: Refine CSS design tokens for high-contrast "Pro" look and feel.
- [ ] **Virtual List Implementation**: Optimize the OOB and Contact lists for high-density scenarios (1000+ items).
- [ ] **TOTCalculator Real Binding**: Wire `TOTCalculator.ts` to read active waypoints from the selected unit's `NavigationComponent` instead of static rows.
- [ ] **FormationEditor Command Dispatch**: Add a "Save Formation" button that converts canvas pixel offsets to world-space metres and dispatches `SetFormation` to the server.

## 10. Deployment & DevOps
- [ ] **Production Build**: Configure a multi-stage Dockerfile for the Gateway Server and Vite-optimised frontend.
- [ ] **Telemetry Export**: Build the `Tracer` export to CSV/Parquet for external data analysis.
- [ ] **Multi-Match Scaling**: Verify horizontal scaling of `MatchService` across multiple Node.js workers or instances.

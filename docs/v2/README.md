# War-Games Engine Documentation

This directory contains the technical documentation for the simulation engine. The documentation is divided into two main categories: **Core Infrastructure** and **Tactical Systems**.

---

## 🏗️ Core Infrastructure
The foundational components that manage memory, entity lifecycle, and simulation orchestration.

### [Engine Orchestrator](./core/Engine.md)
The main simulation controller. Manages the system pipeline, tick loop, and scenario loading.

### [ECSRegistry](./core/ECSRegistry.md)
The primary state interface. Handles entity allocation, property access (numeric vs object), and dirty tracking.

### [WorldBuffer](./core/WorldBuffer.md)
The source of truth. Owns the high-performance `SharedArrayBuffer` memory pools.

### [EntityManager](./core/EntityManager.md)
Handles spawning units from JSON profiles and recursive destruction.

### [TrackManager](./core/TrackManager.md)
Manages the tactical picture (perceived tracks) and uncertainty (CEP).

### [MapManager](./core/MapManager.md)
Terrain, bathymetry, and line-of-sight analysis.

### [Infrastructure](./core/Infrastructure.md)
EventBus, OrderQueue, ProfileRegistry, and Physics Constants.

---

## 🏹 Tactical Systems
Action-oriented systems that implement specific simulation logic.

| System | Description |
| :--- | :--- |
| **[Behavior](./systems/BehaviorSystem.md)** | Autonomous AI and behavior trees. |
| **[Combat](./systems/CombatSystem.md)** | Engagement cycle and weapon deployment. |
| **[Collision](./systems/CollisionSystem.md)** | Physical impact and damage resolution. |
| **[Comm](./systems/CommSystem.md)** | Iron Mesh tactical data links. |
| **[Doctrine](./systems/DoctrineSystem.md)** | ROE and EMCON enforcement. |
| **[EW](./systems/EWSystem.md)** | Jamming and ESM triangulation. |
| **[FlightDeck](./systems/FlightDeckSystem.md)** | Carrier aircraft operations. |
| **[Formation](./systems/FormationSystem.md)** | Escort station-keeping logic. |
| **[Guidance](./systems/GuidanceSystem.md)** | Proportional Navigation (PN) steering. |
| **[Health](./systems/HealthSystem.md)** | Subsystem degradation and death. |
| **[Kinematics](./systems/KinematicsSystem.md)** | Newtonian physics and movement. |
| **[Mission](./systems/MissionSystem.md)** | High-level objective management. |
| **[Mount](./systems/MountSystem.md)** | Turret slewing and predictive lead. |
| **[Refueling](./systems/RefuelingSystem.md)** | Logistics and fuel transfer. |
| **[Sensor](./systems/SensorSystem.md)** | Radar, Sonar, and Visual detection. |
| **[TMS](./systems/TMSSystem.md)** | Track correlation and dead reckoning. |
| **[Waypoint](./systems/WaypointSystem.md)** | Path-following navigation. |
| **[WeaponStage](./systems/WeaponStageSystem.md)** | Multi-stage missile flight. |

---

## 🎮 Order Handlers
High-level commands that translate player/AI intent into simulation state.

### [Order System Architecture](./orders/README.md)
Overview of validation, queueing, and execution logic.

- **[Movement & Navigation](./orders/MovementOrders.md)**: Heading, speed, and positioning.
- **[Combat & Tactical](./orders/CombatOrders.md)**: Targeting and engagement rules.
- **[Sensors & EW](./orders/SensorOrders.md)**: Emission control and active detection.
- **[Aviation Ops](./orders/AviationOrders.md)**: Carrier flight deck management.
- **[Missions & Doctrine](./orders/MissionOrders.md)**: Automated behaviors and ROE.
- **[Formation & Logistics](./orders/FormationLogisticsOrders.md)**: Stations and replenishment.

---

## ⚡ Execution Order (Priority)

Systems run in the following order every tick:

1.  **WaypointSystem** (5)
2.  **FormationSystem** (6)
3.  **KinematicsSystem** (10)
4.  **WeaponStageSystem** (15)
5.  **GuidanceSystem** (15)
6.  **EWSystem** (18)
7.  **DoctrineSystem** (20)
8.  **SensorSystem** (50)
9.  **TMSSystem** (52)
10. **CommSystem** (53)
11. **MissionSystem** (55)
12. **MountSystem** (55)
13. **CombatSystem** (60)
14. **BehaviorSystem** (60)
15. **CollisionSystem** (70)
16. **HealthSystem** (80)
17. **RefuelingSystem** (85)
18. **FlightDeckSystem** (90)

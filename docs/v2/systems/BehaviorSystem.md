# BehaviorSystem

The `BehaviorSystem` is responsible for executing autonomous logic for entities using a lightweight Behavior Tree (BT) implementation. It allows entities to perform complex tasks like patrolling, responding to threats, and managing fuel levels without direct player intervention.

## Core Architecture

The system operates on a per-entity basis during the `update` cycle. It primary focuses on:
1. **Hardcoded Heuristics**: Immediate reactions like evasion and fuel management.
2. **Behavior Tree Execution**: Flexible logic defined in entity profiles.

## Data Access (World Buffer)

The system interacts with the core ECS `WorldBuffer` (`reg.buf`) using the following fields:

| Field | Access | Description |
| :--- | :--- | :--- |
| `hp` | Read | Checks if entity is alive. |
| `positionsX`, `positionsY` | Read | Current world coordinates for navigation. |
| `entityCategories` | Read | Used to identify `Weapon` threats or `Aircraft` for RTB. |
| `fuelKg` | Read | Monitored for Return-To-Base (RTB) logic. |
| `teamIds` | Read | Used to distinguish between friend and foe. |
| `bbTrackIndices` | Read | Identifies the track index of incoming threats. |
| `targetHeadings` | **Write** | Updates the desired heading for the entity. |
| `targetSpeeds` | **Write** | Updates the desired speed (e.g., during evasion). |
| `emconMode` | **Write** | Controls active/passive sensor states (via SCAN_RADAR). |
| `emconOverrides` | Read | Respects player-set EMCON locks. |

### Priority & Update Cycle
- **Priority**: 60 (Executes after `CombatSystem` but before `CollisionSystem`).
- **Target**: All alive entities with `hp > 0`.

---

## 1. Hardcoded Heuristics

Before executing the behavior tree, the system runs two critical safety checks:

### Target Evasion (`handleEvasion`)
- **Detection**: Searches for incoming entities of category `Weapon` that belong to an enemy team.
- **Proximity**: Triggered when a threat is within **10,000 meters (10km)**.
- **Action**:
    - Calculates the bearing to the threat.
    - Sets a new target heading **90 degrees away** from the threat bearing.
    - Increases speed to **max combat speed** (50 kts).

### Return to Base (`handleRTB`)
- **Target**: Only applies to entities in the `Aircraft` category.
- **Trigger**: Fuel level falls below **150kg** (assuming a 1000kg default).
- **Action**: Commands the aircraft to turn toward a fixed base heading (currently 270 degrees in implementation).

---

## 2. Behavior Tree Implementation

The system supports a hierarchical tree structure with the following node types:

| Node Type | Behavior |
| :--- | :--- |
| **Selector** | Executes children in order. Returns **SUCCESS** as soon as one child succeeds. Returns **FAILURE** only if all children fail. |
| **Sequence** | Executes children in order. Returns **FAILURE** as soon as one child fails. Returns **SUCCESS** only if all children succeed. |
| **Action** | Executes a specific command. Returns **SUCCESS**, **FAILURE**, or **RUNNING**. |
| **Condition** | Evaluates a state. Returns **SUCCESS** if true, **FAILURE** if false. |

### Supported Actions

- **PATROL**: 
    - Generates a cyclic path of 4 waypoints around the entity's current position if no waypoints exist.
    - Uses a default radius of **5000m** unless specified in parameters.
- **SET_HEADING**: 
    - Directly sets the `targetHeading` of the entity.
- **SCAN_RADAR**: 
    - Sets `emconMode` to **ACTIVE** unless a player override is present.
- **NAVIGATE_TO_THREAT**: 
    - Identifies the nearest hostile track in the entity's local track buffer.
    - Sets heading and speed (30 kts) to intercept.
    - Will not override manual player waypoints.

### Supported Conditions

Conditions perform a simple comparison against fields in the ECS Registry:
- **Operators**: `LT` (Less Than), `GT` (Greater Than), `EQ` (Equal).
- **Evaluation**: Checks the specified `field` for the entity's `id`.

---

## 3. Implementation Details

- **Profile Integration**: Tree structures are loaded from the `ProfileRegistry` using the `treeId` defined in the entity's behavior component.
- **Dirty Flags**: Sets `DirtyFlags.Behavior` after every update to signal changes to the networking or UI layers.
- **Track Dependency**: Intercept logic relies on the `TrackManager` to find and correlate sensor data.

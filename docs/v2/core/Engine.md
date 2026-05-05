# Engine Orchestrator

The `Engine` class is the central coordinator of the simulation. It wires together the ECS registry, systems, event bus, and order handling logic into a single, cohesive execution pipeline.

## Core Architecture

The engine operates on a fixed-step simulation loop. It has zero knowledge of networking or UI, functioning as a pure tactical simulation state machine.

### Key Components
- **ECSRegistry**: Manages entity state and component access.
- **EntityManager**: Handles entity lifecycle (spawning and destruction).
- **TrackManager**: Manages perceived tactical tracks for all units.
- **OrderQueue**: Buffers incoming player/AI commands.
- **EventBus**: Captures discrete simulation events (e.g., impacts, detections).

---

## 1. Simulation Pipeline (The Tick)

When `engine.tick(dt)` is called, the engine executes systems in a strict, priority-sorted order. This ensures data consistency (e.g., positions are updated before sensors try to detect them).

### Execution Order:
1.  **WaypointSystem** (5): Initial navigation intent.
2.  **KinematicsSystem** (10): Newtonian physics and movement.
3.  **SensorSystem** (50): Detection logic.
4.  **TMSSystem** (52): Correlation of detections into tracks.
5.  **CombatSystem** (60): Engagement decisions and firing.
6.  **CollisionSystem** (70): Impact resolution.
7.  **HealthSystem** (80): Death and damage effects.
*(And many others in between)*

---

## 2. Public API

### `spawn(params: SpawnParams): EntityId`
Creates a new entity based on a profile ID and initial state.

### `dispatch(order: Order): void`
Queues a command (e.g., "Set Heading", "Engage Target") for the next tick. Orders are validated using Zod schemas.

### `runJump(ticks: number, dt: number): TurnSnapshot`
Advances the simulation by multiple ticks. This is used for "jumps" in turn-based play. It returns a comprehensive snapshot of the state and all events that occurred during the jump.

### `loadScenario(manifest: any): void`
Hydrates the world state from a JSON scenario manifest, including units, missions, and global doctrines.

---

## 3. Snapshot & Replay Support

The engine provides two ways to extract state:
- **Object Snapshot**: A rich, JSON-serializable object for UI rendering.
- **Binary State**: A compact `Uint8Array` dump of the `WorldBuffer` for high-performance replay storage and networking.

---

## 4. Interrupt Logic
The engine monitors the `EventBus` for critical events (like "New Tactical Contact" or "Inbound Weapon") and can automatically interrupt a multi-tick jump to return control to the player.

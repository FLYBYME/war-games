# Order System Architecture

The Order System is the mechanism by which external actors (Players, AI, or Scenarios) modify the state of the simulation. It is designed to be **declarative** and **decoupled** from the core engine loop.

## Core Flow

1.  **Submission**: An `Order` object is sent to the `Engine.dispatch(order)`.
2.  **Validation**: The engine validates the order against a **Zod Schema** (`OrderSchema.ts`).
3.  **Queueing**: Validated orders are placed in the `OrderQueue`.
4.  **Drain**: At the start of every tick, the `Engine` drains the `OrderQueue`, sorting orders by timestamp.
5.  **Execution**: For each order, the engine finds the matching `OrderHandler` and calls its `execute()` method.

---

## 🏗️ Order Handlers

Each order type has a corresponding class implementing the `OrderHandler` interface.

### [Full Handler Index](./handlers/README.md)
A complete list of all 34 individual order handlers.

---

## 📋 Categories

- **[Movement & Navigation](./MovementOrders.md)**: Heading, Speed, and Waypoints.
- **[Combat & Tactical](./CombatOrders.md)**: Targeting, Firing, and ROE.
- **[Sensors & EW](./SensorOrders.md)**: Radar/Sonar control and EMCON.
- **[Aviation & Carrier Ops](./AviationOrders.md)**: Readying and launching aircraft.
- **[Missions & Doctrine](./MissionOrders.md)**: Patrols and automated behaviors.
- **[Formation & Logistics](./FormationLogisticsOrders.md)**: Station-keeping and replenishment.

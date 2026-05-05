# RefuelingSystem

The `RefuelingSystem` handles proximity-based fuel transfer between "Tanker" units and "Receiver" units. It simulates tactical refueling operations (e.g., Aerial Refueling or Replenishment at Sea).

## Core Architecture

The system monitors tankers and nearby friendly units. When a compatible unit in need of fuel comes within range, a transfer session is automatically initiated.

### Priority & Update Cycle
- **Priority**: 85 (Executes after most movement systems).
- **Target**: All alive entities.

---

## 1. Transfer Logic

### Tanker Configuration
A unit acts as a tanker if its profile contains a `logistics.tanker` configuration. This includes:
- **Transfer Rate**: Kg of fuel transferred per minute.
- **Max Transfer**: Total fuel limit per receiver per session.
- **Compatible Receivers**: List of profile IDs that can receive fuel from this tanker.
- **Rendezvous Range**: The maximum distance required to start/maintain refueling.

### Transfer Session
- **Initiation**: Starts when a friendly unit is within range and its fuel level is below **80%**.
- **Execution**: Every tick, fuel is subtracted from the tanker and added to the receiver based on the `transferRate`.
- **Completion**: The transfer ends when the receiver reaches **95%** fuel, the tanker runs dry, the `maxTransfer` is reached, or the units move out of range.

---

## 2. Data Access (World Buffer)

| Field | Access | Description |
| :--- | :--- | :--- |
| `hp` | Read | Dead units cannot refuel or provide fuel. |
| `teamIds` | Read | Refueling is restricted to friendly units. |
| `positionsX/Y/Z` | Read | Used for proximity (rendezvous) checks. |
| `fuelKg` | **Read/Write** | Subtracted from tanker; added to receiver. |
| `profileIds` | Read | Used to check for tanker/receiver compatibility. |

---

## 3. Events

- **RefuelingStart**: Triggered when a new transfer session begins.
- **RefuelingComplete**: Triggered when the receiver is full or the max transfer limit is reached.
- **RefuelingAborted**: Triggered if units move out of range or the tanker is destroyed.

---

## 4. Implementation Details

- **Dirty Flags**: Sets `DirtyFlags.Kinematics` on both units after fuel amounts are modified to ensure UI and network synchronization.
- **Concurrent Transfers**: A single tanker can support multiple receivers simultaneously if they are all within range.

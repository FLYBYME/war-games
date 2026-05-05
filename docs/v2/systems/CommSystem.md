# CommSystem

The `CommSystem` manages the tactical data link (Iron Mesh), simulating a topology-dependent network that synchronizes track databases across units. It ensures that entities sharing a network and having a viable line-of-sight can share tactical information.

## Core Architecture

The system operates in two main phases:
1. **Topology Calculation**: Identifying which units can "talk" to each other.
2. **TMS Synchronization**: Merging local track databases within connected subnets.

### Priority & Update Cycle
- **Priority**: 53 (Executes after TMS correlation but before Combat).
- **Target**: All alive entities with an active comm node (`commIsActive > 0`).

---

## 1. Network Topology

### Link Viability (`isLinkViable`)
A communication link between two units (U and V) is established only if all these conditions are met:
- **Team Match**: Both units must belong to the same team.
- **Network ID Match**: Both units must be on the same `commNetworkId`.
- **Line-of-Sight (LOS)**: Blocked by terrain curvature or map features.
- **Hardware Range**: Distance must be within the `maxRangeM` of both units.
- **Link Budget (SNR)**:
    - Calculates Signal-to-Noise Ratio (SNR) using Transmit Power, Path Loss (Free Space Path Loss formula), and Receiver Sensitivity.
    - **Jamming Impact**: Environmental jamming noise (`commJammingNoiseRatio`) reduces effective sensitivity.

### Subnet Formation
The system builds an adjacency list of viable links and uses a Breadth-First Search (BFS) to identify "subnets" (connected components). A subnet must have at least 2 units to facilitate synchronization.

---

## 2. Synchronization Logic (`syncSubnet`)

Units in the same subnet synchronize their local Track Management System (TMS) databases:
- **Best Track Selection**: For every unique entity detected in the subnet, the system identifies the "best" track (the one with the most recent `lastUpdatedTick`).
- **Broadcast**: This best track is then copied to the local buffers of all units in the subnet.
- **Data Shared**: Position, Velocity, CEP Radius, Classification, Confidence, and Engagement Count.

---

## 3. Data Access (World Buffer)

The `CommSystem` interacts with both the `ECSRegistry` buffer and the `TrackManager` buffer:

| Field | Access | Description |
| :--- | :--- | :--- |
| `hp` | Read | Checks if entity is alive. |
| `commIsActive` | Read | Identifies units with active communications hardware. |
| `teamIds` | Read | Restricts communications to allied units. |
| `commNetworkId` | Read | Logical network filter (e.g., Link-16, Link-11). |
| `positionsX/Y/Z` | Read | Used for distance and LOS calculations. |
| `maxRangeM` | Read | Hardware-defined maximum transmission distance. |
| `commTxPower` | Read | Power (Watts) used in link budget calculation. |
| `commRxSensitivity`| Read | Sensitivity (dBm) required to maintain a link. |
| `commJammingNoiseRatio`| Read | Environmental noise floor increased by enemy jamming. |

---

## 4. Events & Status

- **CommsRestored**: Emitted when a unit joins a subnet (at least 2 units connected).
- **CommsLost**: Emitted when a unit loses connection to all peers in its network.

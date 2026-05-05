# FlightDeckSystem

The `FlightDeckSystem` manages carrier-based aircraft operations, including the readying of airframes, launch sequences, and recovery into the hangar.

## Core Architecture

The system treats aircraft as child entities of a carrier. It manages the internal state of the flight deck through three primary queues:
1. **Readying Queue**: Preparation and loadout phase.
2. **Launch Queue**: Staging for takeoff.
3. **Recovery Queue**: Returning from flight.

### Priority & Update Cycle
- **Priority**: 90 (Executes late in the tick).
- **Target**: Entities with a `FlightDeck` component (Carriers).

---

## 1. Operational Phases

### Readying (`readyAircraft`)
- **Action**: Moves an aircraft from the hangar to a "ready spot."
- **Prep Time**: Takes **300 ticks** (approx. 30 seconds at 10 TPS) to simulate arming and fueling.
- **Constraint**: Cannot ready more aircraft than the total deck/hangar capacity.

### Launching
- **Action**: Spawns the aircraft entity into the world.
- **Rate**: Controlled by `launchRatePerMinute`.
- **Logic**: Entities are spawned at an altitude of **100m** at the carrier's current position and heading.
- **Event**: Emits `AircraftLaunched` when the entity is moved to the `inFlight` list.

### Recovery (`queueRecovery`)
- **Action**: Moves an in-flight aircraft into the recovery sequence.
- **Rate**: Controlled by `recoveryRatePerMinute`.
- **Completion**: The aircraft entity is removed from the world (`reg.free`) and returned to the hangar state.

---

## 2. Data Access (World Buffer)

| Field | Access | Description |
| :--- | :--- | :--- |
| `hp` | Read | Checks if carrier is still operational. |
| `positionsX/Y/Z` | Read | Launch and recovery coordinates (based on carrier position). |
| `rotations` | Read | Initial heading for launched aircraft. |
| `hangarCount` | **Write** | Updates the number of aircraft currently "in flight" from this carrier. |
| `teamIds` | Read | Inherited by spawned aircraft. |

---

## 3. Flight Deck Constraints

- **Capacity**: Total limit on the number of aircraft the carrier can manage (Readying + Launching + In Flight).
- **Hangar Count**: The `hangarCount` buffer field tracks the current number of aircraft in the `inFlight` list. This is used by the UI and other systems to monitor carrier load.

---

## 4. Events

- **ReloadStarted**: Triggered when the readying process begins.
- **WeaponReady**: Triggered when preparation is complete and the aircraft moves to the launch queue.
- **AircraftLaunched / AircraftRecovered**: Signify the transitions between the flight deck and the world.
- **FlightDeckFull**: Error event when capacity limits are exceeded.

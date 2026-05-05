# READY_AIRCRAFT

Prepares an aircraft for launch by moving it to the flight deck and applying a specific loadout.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `aircraftProfileId`| `string` | The ID of the aircraft profile to prepare. |
| `loadoutProfileId` | `string` | The ID of the loadout profile to apply. |

## Effect

1.  **Preparation**: Calls `FlightDeckSystem.readyAircraft()`.
2.  **Queueing**: Adds the aircraft to the readying queue. The aircraft will be available for launch after a delay defined by the platform's `launchReadyTicks`.

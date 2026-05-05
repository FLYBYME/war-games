# LAUNCH_AIRCRAFT

Launches a previously readied aircraft from the flight deck.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `aircraftProfileId`| `string` | The ID of the aircraft to launch. |

## Effect

1.  **Queueing**: Calls `FlightDeckSystem.queueLaunch()`.
2.  **System Action**: The `FlightDeckSystem` will process the launch queue, spawning the aircraft as a new entity once a launch spot (catapult/runway) is available.

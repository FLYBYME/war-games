# RECOVER_AIRCRAFT

Commands an airborne aircraft to land on the platform.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `aircraftId` | `number` | The ground-truth `EntityId` of the aircraft to recover. |

## Effect

1.  **Queueing**: Calls `FlightDeckSystem.queueRecovery()`.
2.  **System Action**: The aircraft will fly toward the carrier and enter a recovery pattern. Once on deck, the entity will be destroyed and returned to the carrier's hangar inventory.

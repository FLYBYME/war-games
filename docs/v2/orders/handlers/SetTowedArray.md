# SET_TOWED_ARRAY

Controls the deployment and retrieval of a towed sonar array.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `deployed` | `boolean` | `true` to deploy, `false` to retrieve. |
| `lengthPct` | `number` | (Optional) The percentage of the cable to pay out (default: 100%). |

## Effect

1.  **Validation**: Verifies that the platform has a sensor marked as `isTowedArray`.
2.  **State Update**: Sets `sonarIsActive` and `deployedPct` in the `SensorComponent`.
3.  **Dirty Flags**: Marks the entity as `Sensors` dirty.
4.  **Events**: Emits `SENSOR_UPDATE` with the new array status.

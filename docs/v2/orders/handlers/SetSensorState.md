# SET_SENSOR_STATE

Controls the operational state of individual sensors or sensor types.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `sensorType` | `string` | The type of sensor: `RADAR`, `SONAR`, or `OECM`. |
| `state` | `string` | `ACTIVE` or `SILENT`. |
| `mountIdx` | `number` | (Optional) The specific sensor index to target. If omitted, all sensors of the type are toggled. |

## Effect

1.  **Validation**: Verifies that the platform has at least one sensor of the requested type using the `CapabilityProvider`.
2.  **State Update**: Sets `radarIsActive` or `sonarIsActive` in the platform's `SensorComponent` array.
3.  **Dirty Flags**: Marks the entity as `Sensors` dirty.
4.  **Events**: Emits `OrderRejected` if the sensor type is not found.

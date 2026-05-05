# SET_MASTER_EMCON

Sets the global Emission Control (EMCON) level for the platform.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `mode` | `string` | `ACTIVE` or `SILENT`. |

## Effect

1.  **Mode Setting**: Sets `emconMode[id]` in the WorldBuffer.
2.  **Override**: Sets an `emconOverride` in the registry. This prevents the `DoctrineSystem` from automatically changing the EMCON level based on its own logic.
3.  **Dirty Flags**: Marks the entity as `Sensors` dirty.
4.  **Events**: Emits `SENSOR_STATE` with the new mode.

# SET_SPEED

Commands the unit to change its desired speed.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `speedKts` | `number` | (Optional) Desired speed in knots. |
| `preset` | `string` | (Optional) Preset level (e.g., `STOP`). |

## Effect

1.  **Conversion**: Converts Knots to Meters per Second using `Physics.KTS_TO_MPS`.
2.  **Target Setting**: Sets `targetSpeeds[id]` in the WorldBuffer.
3.  **Dirty Flags**: Marks the entity as `Kinematics` dirty.

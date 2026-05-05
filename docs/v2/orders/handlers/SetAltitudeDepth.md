# SET_ALTITUDE_DEPTH

Commands a unit to change its vertical position. Supports both absolute values and presets.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `altitudeM`| `number` | (Optional) Absolute altitude/depth in meters. |
| `preset` | `string` | (Optional) Preset level (e.g., `HIGH`, `LOW`, `DEEP`). |

## Effect

1.  **Value Setting**: Sets `targetAltitudeM` in the WorldBuffer.
2.  **Presets (Aircraft)**:
    - `NAP_OF_EARTH`: 50m
    - `LOW`: 500m
    - `MEDIUM`: 5,000m
    - `HIGH`: 10,000m
    - `MAX`: 20,000m
3.  **Presets (Submarines)**:
    - `PERISCOPE`: -15m
    - `DEEP`: -200m
4.  **Dirty Flags**: Marks the entity as `Kinematics` dirty.

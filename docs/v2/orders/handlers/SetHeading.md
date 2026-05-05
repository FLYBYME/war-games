# SET_HEADING

Commands the unit to turn to a specific heading.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `heading` | `number` | The desired absolute heading (0-359 degrees). |

## Effect

1.  **Target Setting**: Sets `targetHeadings[id]` in the WorldBuffer.
2.  **Dirty Flags**: Marks the entity as `Kinematics` dirty.
3.  **System Action**: The `KinematicsSystem` will rotate the unit toward this heading during its next update.

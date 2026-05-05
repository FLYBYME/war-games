# NAVIGATE_TO

Sets one or more waypoints for the unit to follow.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `x` | `number` | (Optional) X coordinate for a single-point destination. |
| `y` | `number` | (Optional) Y coordinate for a single-point destination. |
| `waypoints` | `array` | (Optional) A list of `{x, y, z}` coordinates for a multi-point path. |

## Effect

1.  **Waypoint Update**: Replaces the unit's current waypoint list with the new path.
2.  **System Action**: The `WaypointSystem` will steer the unit toward the first waypoint in the list.

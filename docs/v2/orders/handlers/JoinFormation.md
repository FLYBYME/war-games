# JOIN_FORMATION

Commands a unit to join a formation and maintain a specific position relative to a guide (lead) unit.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `targetId` | `number` | (Optional) Ground-truth ID of the guide. |
| `targetName` | `string` | (Optional) Name of the guide unit. |
| `bearingFromGuide` | `number` | The desired bearing (degrees) from the guide to the unit. |
| `distanceFromGuideMeters`| `number`| The desired distance (meters) from the guide. |
| `navToleranceMeters`| `number` | (Optional) How precisely the unit must stay in station (default: 200m). |

## Effect

1.  **Guide Resolution**: Resolves the target to an `EntityId`.
2.  **Formation Component**: Attaches a `FormationComponent` to the unit with the specified relative geometry.
3.  **Dirty Flags**: Marks the entity as `Kinematics` dirty.
4.  **System Action**: The `FormationSystem` will now automatically override the unit's waypoints to keep it in station.

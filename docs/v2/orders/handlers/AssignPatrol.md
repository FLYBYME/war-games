# ASSIGN_PATROL

Assigns a unit to a Combat Air Patrol (CAP) or general patrol mission within a specified area.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `center` | `object` | The `{x, y}` coordinates of the patrol center. |
| `radiusNm` | `number` | The radius of the patrol area in Nautical Miles. |

## Effect

1.  **Mission Creation**: Attaches a `MissionComponent` to the entity.
2.  **Mission State**: Initializes the mission in `PREPARATION` state.
3.  **Area Logic**: 
    - **Patrol Area**: Defined by the provided center and radius.
    - **Prosecution Area**: Automatically set to 150% of the patrol radius. The unit will engage targets within this larger area while remaining tethered to the patrol center.
4.  **Dirty Flags**: Marks the entity as `Mission` dirty.

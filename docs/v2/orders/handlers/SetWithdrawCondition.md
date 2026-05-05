# SET_WITHDRAW_CONDITION

Sets the conditions under which a unit will automatically abandon its mission and return to base.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `condition` | `string` | The condition type: `BINGO` (fuel) or `WINCHESTER` (ammo). |
| `threshold` | `number` | The value at which the condition triggers. |

## Effect

1.  **Validation**: Verifies that the unit has an active mission.
2.  **Update**: Sets `rtbThresholdFuel` or `rtbThresholdAmmo` in the unit's `MissionComponent`.
3.  **Feedback**: Logs the new threshold setting.

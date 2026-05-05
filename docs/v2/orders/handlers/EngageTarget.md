# ENGAGE_TARGET

Commands the platform to engage a specific target. This is the primary order for initiating combat.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `targetId` | `number` | (Optional) Ground-truth ID of the target. |
| `targetName` | `string` | (Optional) Name of the target to resolve. |
| `trackId` | `string` | (Optional) Perceived track ID. |

## Effect

1.  **Validation**: Verifies that the actor is NOT a weapon (weapons cannot "engage" other targets autonomously).
2.  **Target Resolution**: Maps the input to a local `TrackIndex`.
3.  **Locking**: Sets `bbTrackIndices` and `bbTargetIds`.
4.  **Rules of Engagement**: Automatically sets `weaponPostures` to `FREE` for this unit.
5.  **Events**: Emits `TARGET_LOCKED`.

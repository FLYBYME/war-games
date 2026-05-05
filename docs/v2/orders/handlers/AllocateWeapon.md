# ALLOCATE_WEAPON

Assigns a specific weapon profile and quantity to a target without necessarily firing immediately. This order is used to "prime" the combat system for an engagement.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `targetId` | `number` | (Optional) Ground-truth ID of the target. |
| `targetName` | `string` | (Optional) Name of the target to resolve. |
| `trackId` | `string` | (Optional) Perceived track ID from the unit's tactical picture. |
| `weaponProfileId`| `string` | The ID of the weapon profile to allocate. |
| `quantity` | `number` | How many units of the weapon to allocate. |

## Effect

1.  **Target Resolution**: Resolves the target to a `TrackIndex` in the platform's local tactical picture.
2.  **Blackboard Update**: Sets `bbTrackIndices[id]` and `bbTargetIds[id]` in the WorldBuffer.
3.  **Weapon Posture**: Automatically sets the unit's `WeaponPosture` to `FREE` to allow the automated combat logic to take over.
4.  **Dirty Flags**: Marks the entity as `Combat` dirty.
5.  **Events**: Emits `TARGET_LOCKED` with the allocated weapon details.

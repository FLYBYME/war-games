# SET_ROE_POSTURE

Sets the Rules of Engagement (ROE) posture for a specific domain or all domains.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `domain` | `string` | The tactical domain: `AIR`, `SURFACE`, `SUB`, or `ALL`. |
| `posture` | `string` | The ROE level: `FREE`, `TIGHT`, or `HOLD`. |

## Effect

1.  **Posture Update**: Updates the domain-specific ROE fields in the WorldBuffer (`roeAir`, `roeSurface`, `roeSub`).
2.  **Global Update**: If `domain` is `ALL`, it also updates the unit's general `weaponPostures`.
3.  **Dirty Flags**: Marks the entity as `Doctrine` dirty.

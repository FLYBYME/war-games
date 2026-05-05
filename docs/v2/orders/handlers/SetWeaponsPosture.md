# SET_WEAPONS_POSTURE

Sets the global weapons engagement policy for the platform.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `posture` | `string` | The policy: `FREE`, `TIGHT`, or `HOLD`. |

## Effect

1.  **State Update**: Sets `weaponPostures[id]` in the WorldBuffer.
2.  **Override**: Sets a `postureOverride` in the registry. This prevents the `DoctrineSystem` from automatically changing the posture based on perceived threat levels.
3.  **Dirty Flags**: Marks the entity as `Combat` dirty.

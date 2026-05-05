# SET_WRA

Configures the **Weapon Release Authorization (WRA)** rules for a platform.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `targetCategory` | `string` | The category of target (e.g., `AIR`, `SURFACE`). |
| `weaponProfileId`| `string` | The ID of the weapon to configure. |
| `salvoSize` | `number` | How many units of the weapon to fire at each target of this category. |

## Effect

1.  **Doctrine Update**: Updates the unit's `DoctrineComponent`. If no doctrine exists, a new one is initialized.
2.  **Logic**: Maps `targetCategory -> weaponProfileId -> salvoSize`.
3.  **Dirty Flags**: Marks the entity as `Doctrine` dirty.
4.  **Events**: Emits `DOCTRINE_UPDATE` with the new WRA rules.

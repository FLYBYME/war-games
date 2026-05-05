# BOL_LAUNCH

Executes a **Bearing-Only Launch**. This allows a platform to fire a weapon toward a specific heading without requiring a sensor lock on a target.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `weaponProfileId`| `string` | The ID of the weapon profile to fire. |
| `bearing` | `number` | The relative bearing (degrees) to fire the weapon on. |

## Effect

1.  **Validation**: Verifies that the platform has a compatible mount and sufficient ammunition.
2.  **Ammunition Consumption**: Reduces the ammo count in the corresponding mount stride by 1.
3.  **Weapon Spawning**: 
    - Spawns a new entity for the weapon.
    - Calculates absolute bearing based on the platform's current rotation.
    - Sets the weapon's `parentId` to the launcher.
4.  **Initial State**: The weapon is spawned at the platform's position and speed, heading along the BOL bearing.
5.  **Events**: Emits `WEAPON_FIRED` with the `isBol: true` flag.

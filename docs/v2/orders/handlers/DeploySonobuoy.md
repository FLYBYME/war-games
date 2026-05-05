# DEPLOY_SONOBUOY

Deploys a sonobuoy (passive or active) to detect subsurface contacts.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `buoyProfileId` | `string` | The ID of the sonobuoy profile to spawn. |
| `depthM` | `number` | (Optional) The target depth for the hydrophone. |

## Effect

1.  **Inventory Check**: Consumes from `vlsCount` or `torpedoCount` (or aircraft-specific racks).
2.  **Spawning**: 
    - Creates a new `Sensor` category entity.
    - Sets the initial medium to `Surface`.
3.  **Depth Control**: Sets `targetAltitudeM` to `-depthM`. The `KinematicsSystem` will then "sink" the hydrophone to the desired depth.
4.  **Events**: Emits `WEAPON_FIRED` with the `isSonobuoy: true` flag.

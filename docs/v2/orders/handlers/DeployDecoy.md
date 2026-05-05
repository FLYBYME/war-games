# DEPLOY_DECOY

Deploys an expendable countermeasure (e.g., Chaff, Flare, or Nulka decoy) to spoof incoming threats.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `decoyProfileId` | `string` | The ID of the decoy profile to spawn. |

## Effect

1.  **Inventory Check**: Verifies that `chaffCount` is greater than 0.
2.  **Consumption**: Decrements `chaffCount` by 1.
3.  **Spawning**: 
    - Creates a new platform entity for the decoy.
    - Sets `ewIsDecoy` to 1 in the WorldBuffer.
    - The decoy is spawned at the platform's location but usually with a much lower speed (drifting).
4.  **Events**: Emits `WEAPON_FIRED` with the `isDecoy: true` flag.

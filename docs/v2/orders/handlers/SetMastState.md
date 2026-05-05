# SET_MAST_STATE

Controls the extension of retractable masts (Periscope, ESM, Snorkel) on a submarine.

## Parameters

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `raised` | `boolean` | `true` to raise, `false` to lower. |

## Effect

1.  **Validation**: Verifies that the platform has the `RetractableMast` capability.
2.  **State Setting**: Sets `mastRaised[id]` in the WorldBuffer.
3.  **Signature Impact**: Raising a mast significantly increases the unit's visual and radar signature (RCS).
4.  **Sensor Impact**: Some sensors (like ESM or Visual) may only function when the mast is raised.
5.  **Events**: Emits `SENSOR_UPDATE` with the new mast state.

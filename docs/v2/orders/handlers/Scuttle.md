# SCUTTLE

Commands the unit to self-destruct. This is typically used to prevent capture or clear space for other units.

## Parameters

This order takes no parameters.

## Effect

1.  **Immediate Destruction**: Sets the unit's `hp` to 0 in the WorldBuffer.
2.  **System Cleanup**: The `HealthSystem` will process the death in the same tick, clearing components and emitting `ENTITY_DESTROYED`.

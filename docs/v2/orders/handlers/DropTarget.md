# DROP_TARGET

Clears the platform's current target assignment.

## Parameters

This order typically takes no parameters, as it acts on the currently locked target.

## Effect

1.  **Blackboard Reset**: Sets `bbTargetIds[id]` and `bbTrackIndices[id]` to `-1`.
2.  **Dirty Flags**: Marks the entity as `Combat` dirty.

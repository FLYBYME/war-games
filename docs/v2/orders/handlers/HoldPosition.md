# HOLD_POSITION

Commands the platform to stop all movement and remain at its current location.

## Parameters

This order typically takes no parameters.

## Effect

1.  **Kinematics Update**: Sets `targetSpeeds` to 0 and `targetHeadings` to the current rotation.
2.  **Navigation Cleanup**: Clears all active waypoints.
3.  **Dirty Flags**: Marks the entity as `Kinematics` dirty.

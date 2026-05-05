# Movement & Navigation Orders

These orders control the physical movement and positioning of entities. They primarily interact with the `KinematicsSystem` and `WaypointSystem`.

- **[SET_HEADING](./handlers/SetHeading.md)**: Changes the unit's desired heading.
- **[SET_SPEED](./handlers/SetSpeed.md)**: Changes the unit's desired speed.
- **[SET_ALTITUDE_DEPTH](./handlers/SetAltitudeDepth.md)**: Changes the unit's desired altitude or depth.
- **[NAVIGATE_TO](./handlers/NavigateTo.md)**: Sets a single-point destination or a multi-point path.
- **[HOLD_POSITION](./handlers/HoldPosition.md)**: Commands the unit to stop and remain at its current location.
- **[SET_SPRINT_DRIFT](./handlers/SetSprintDrift.md)**: Toggles the "Sprint and Drift" tactic.

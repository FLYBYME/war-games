# EntityManager

The `EntityManager` is responsible for the physical instantiation of entities into the simulation. It bridges the gap between static **JSON Profiles** and the live **ECS Registry**.

## Core Architecture

The manager reads profile data once and "hydrates" the ECS buffers with initial values. It also handles complex multi-entity structures like Formations and hosted units (carrier aircraft).

---

## 1. Spawning Process

When `spawn(params)` is called:
1.  **Profile Lookup**: Retrieves the JSON definition from the `ProfileRegistry`.
2.  **Allocation**: Requests a new ID from the `ECSRegistry`.
3.  **Hydration**: 
    - **Metadata Auto-Hydration**: Uses a schema registry to automatically map JSON paths (e.g., `kinematics.maxSpeed`) to ECS buffer fields.
    - **Inference**: Automatically determines `EntityCategory` and `TraversalMedium` if not explicitly defined.
4.  **Kinematics Resolution**: Converts Latitude/Longitude (if provided) into simulation-space `X/Y` coordinates using a `GeoProjection`.

---

## 2. Complex Spawns

### Formations
If a profile defines a "Formation Template," the manager:
1.  Spawns the "Guide" (Lead) ship.
2.  Iterates through the "Stations," calculating their initial offsets based on the guide's heading.
3.  Attaches `FormationComponents` to the escorts so they maintain their relative positions.

### Hosted Units
The manager supports recursive spawning. If a platform (like a carrier) has `hostedUnits` in its spawn parameters, the manager will spawn those aircraft and set their `parentId` to the carrier.

---

## 3. Destruction & Orphan Cleanup

When an entity is destroyed:
1.  **Event**: Emits `ENTITY_DESTROYED`.
2.  **Recursive Cleanup**: The manager automatically identifies all children (missiles launched by the unit, aircraft embarked on it) and destroys them recursively.
3.  **Registry Release**: Returns the ID to the `ECSRegistry` for future reuse.

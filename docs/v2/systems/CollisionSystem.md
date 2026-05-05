# CollisionSystem

The `CollisionSystem` is a critical physics component that handles spatial queries, terrain grounding, and weapon effect resolution. It uses a spatial partitioning strategy to maintain high performance even with large numbers of entities.

## Core Architecture

### Broad-phase Optimization
- **SpatialHashGrid**: The system uses a `SpatialHashGrid` with a cell size of **2000 meters**.
- **Update Cycle**: The grid is completely cleared and rebuilt every tick with the positions of all alive entities.

## Data Access (World Buffer)

The system is a heavy consumer and modifier of the `WorldBuffer`:

| Field | Access | Description |
| :--- | :--- | :--- |
| `positionsX/Y/Z` | Read | Core spatial data for grid and proximity checks. |
| `hp` | **Read/Write** | Reads life status; Writes damage/destruction results. |
| `mediums`, `draftMeters`| Read | Used for terrain grounding logic (depth checks). |
| `distanceTraveled` | Read | Used to self-destruct weapons at `maxRangeM`. |
| `ballisticFlight` | Read | Triggers detonation upon ground impact (`z <= 0`). |
| `radii` | Read | Summed with target radii for proximity fuzing. |
| `speeds`, `targetSpeeds`| **Write** | Set to 0 immediately upon grounding. |
| `armorModifier` | Read | Scales damage during impact resolution. |
| `componentHealth` | **Read/Write** | Random components damaged during impacts. |
| `godMode` | Read | Prevents damage if enabled on the target. |

### Priority & Update Cycle
- **Priority**: 70 (Executes after `BehaviorSystem` and `CombatSystem`).
- **Target**: All alive entities.

---

## 1. Terrain & Boundaries

### Grounding (`handleGrounding`)
- **Water Entities**: Ships and other water-based entities are checked against the map's depth.
- **Depth Check**: If the water depth is less than the entity's `draftMeters`, the entity is grounded.
- **Map Bounds**: Entities leaving the map area are automatically grounded/destroyed.
- **Consequences**:
    - Speed is set to 0 immediately.
    - Damage is applied (`Physics.GROUNDING_DAMAGE_PER_TICK`).
    - A `SimEventType.Grounding` event is emitted.

---

## 2. Weapon Resolution

The system handles both ballistic impacts and proximity-fuzed detonations.

### Proximity Detonation
- **Trigger**: Weapons check for targets within their `radius` plus the target's `radius`.
- **Safety**: Weapons will not detonate within the first **50 meters** of travel to prevent self-destruction.
- **Logic**: If a hostile entity is within range, the weapon detonates.

### Impact & Damage Resolution (`resolveDamage`)
When a weapon detonates, it calculates damage based on several factors:

| Factor | Description |
| :--- | :--- |
| **Pk Dud Roll** | Based on the weapon's maintenance factor. If it fails, only minimal kinetic damage (10 HP) is dealt. |
| **Damage Type: Kinetic** | Highly variable (70% - 130%). Deals **50% reduced damage** to unarmored targets (Over-Penetration). |
| **Damage Type: Blast** | Consistent (90% - 110%). |
| **Critical Hit** | 5% flat chance to deal **2x damage**. |
| **Armor Modifier** | Final damage is scaled by the target's `armorModifier`. |
| **Component Damage** | 20% chance to damage one of the target's 8 internal components by 10-50%. |

### Evasion Roll (`Ph`)
Before damage is applied, the target has a chance to evade based on its speed:
- **Probability**: `1.0 - min(0.5, speed / 500)`. 
- Faster targets (e.g., supersonic aircraft) are significantly harder to hit, capped at a 50% evasion bonus.

---

## 3. Safety & Special Cases

- **God Mode**: Entities with `godMode` enabled are immune to damage (the weapon is destroyed but the target remains unharmed).
- **Friendly Fire**: Controlled by the `armOnFriendly` flag on the weapon. By default, weapons only target enemies.
- **Max Range**: Weapons automatically self-destruct if they exceed their `maxRangeM`.
- **Ballistic Ground Impact**: Projectiles with `ballisticFlight` enabled will detonate if they hit the ground (`z <= 0`).

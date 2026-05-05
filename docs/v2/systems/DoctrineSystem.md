# DoctrineSystem

The `DoctrineSystem` enforces high-level tactical rules such as Emission Control (EMCON) and Rules of Engagement (ROE). It acts as the "brain" that translates strategic directives into specific entity behaviors like sensor states and weapon postures.

## Core Architecture

The system reconciles three levels of authority:
1. **Global/Team Doctrine**: Defaults for the entire faction.
2. **Unit Doctrine**: Specific rules defined in the entity's profile.
3. **Player Overrides**: Explicit commands that bypass doctrine.

### Priority & Update Cycle
- **Priority**: 20 (Executes early in the tick).
- **Target**: All alive entities with a doctrine component.

---

## 1. EMCON Enforcement

EMCON (Emission Control) dictates how unit sensors behave to manage their electronic signature.

| Level | Description | Resulting `emconMode` |
| :--- | :--- | :--- |
| **ALPHA** | Silent mode. All active emitters (radar, jammers) are disabled. | `SILENT` |
| **BRAVO** | Passive mode. Active emitters off, but ESM (Electronic Support Measures) is forced ON. | `SILENT` |
| **CHARLIE** | Active mode. Radars and active sensors are permitted to transmit. | `ACTIVE` |

### Player Overrides
If a player or order has explicitly set an EMCON mode (`emconOverrides`), the doctrine system will respect this setting and skip its internal logic until the override is cleared.

---

## 2. Rules of Engagement (ROE)

ROE determines the `weaponPosture` of an entity, which controls its autonomous firing behavior.

| Posture | Behavior |
| :--- | :--- |
| **HOLD** | Do not fire unless explicitly ordered by a player/order. |
| **TIGHT** | Fire only at targets identified as HOSTILE. |
| **FREE** | Fire at any target not identified as FRIENDLY (engages UNKNOWNs). |

The system automatically maps domain-specific ROE (e.g., `roeAir`, `roeSurface`) based on the entity's `medium` (Air, Water, Sub).

---

## 3. Data Access (World Buffer)

| Field | Access | Description |
| :--- | :--- | :--- |
| `hp` | Read | Checks if entity is alive. |
| `teamIds` | Read | Used to look up team-wide doctrine defaults. |
| `mediums` | Read | Used to select domain-specific ROE (Air vs Surface). |
| `emconOverrides` | Read | Player/Order command that takes precedence. |
| `postureOverrides` | Read | Player/Order ROE command that takes precedence. |
| `emconMode` | **Write** | Sets the unit's current EMCON state (Active/Silent). |
| `ewEmissionState` | **Write** | Controls the EW signature (0=Off, 1=Radar, 2=Jamming). |
| `weaponPostures` | **Write** | Sets the autonomous fire threshold (Hold/Tight/Free). |
| `jammerIsActive` | Read | If active, forces `ewEmissionState` to Jamming mode. |

---

## 4. Implementation Details

- **ESM Activation**: In BRAVO mode, the system iterates through all sensors on the entity and forces `esmIsActive` to true if supported.
- **Dirty Flags**: Sets `DirtyFlags.Doctrine` to signal state changes.

# Magic Numbers Inventory

This document tracks identified "magic numbers" (hardcoded constants) across the codebase. These should be refactored into named constants in relevant `Constants.ts` files to improve maintainability and readability.

## 1. Engine / Physics
Centralized constants are located in `src/engine/PhysicsConstants.ts`. Some components still shadow these or use specific thresholds.

| Constant | Value | Purpose |
| :--- | :--- | :--- |
| `Air Density` | 1.225 | Standard at SL (`Environment.ts`) |
| `Sound Speed` | 1500 | m/s (`Environment.ts`, `Subsurface.ts`) |
| `Earth Gravity` | 9.80665 | `PhysicsConstants.ts` |

## 2. Sensors (`src/engine/components/Sensors.ts`)
| Constant | Value | Purpose |
| :--- | :--- | :--- |
| `maxRangeM` | 20000 | Default radar detection range (meters) |
| `beamWidthDeg` | 360 | Omnidirectional sensor beam width |
| `txPowerKw` | 50 | Default sensor transmit power |
| `sensitivityDbm` | -110 | Default receiver sensitivity |
| `frequencyMhz` | 3000 | S-band central frequency |
| `processingGainDb` | 30 | Standard processing gain |

## 3. Physics (`src/engine/components/Physics.ts`)
| Constant | Value | Purpose |
| :--- | :--- | :--- |
| `massKg` | 1000 | Default entity mass |
| `massEmptyKg` | 1000 | Default entity empty mass |

## 4. Propulsion (`src/engine/components/Propulsion.ts`)
| Constant | Value | Purpose |
| :--- | :--- | :--- |
| `maxThrustDryN` | 70000 | Default dry thrust (Newtons) |
| `maxThrustAbN` | 110000 | Default afterburner thrust |
| `abThreshold` | 0.95 | Throttle threshold to engage afterburner |
| `spoolRate` | 0.15 | % change per second |

## 5. Combat & Health
| Constant | Value | Purpose |
| :--- | :--- | :--- |
| `hp`/`maxHp` | 100 | Default entity health |
| `Azimuth Range` | -180 to 180 | Degrees |
| `Elevation Range` | -20 to 85 | Degrees |

## 6. CLI & Server Constants
| Constant | Value | Purpose |
| :--- | :--- | :--- |
| `Port` | 3000 | CLI and Server listening port |
| `API Prefix` | v2 | API endpoint version |

## 7. Conversions
| Constant | Value | Purpose |
| :--- | :--- | :--- |
| `0.514444` | Speed (kt to m/s) | Used extensively in systems |
| `Math.PI / 180` | Degrees to Radians | Used throughout geometry calculations |

## Recommendations
1.  **Refactor CLI/Server Constants**: Centralize configuration (e.g., `config.ts`) instead of using magic strings/numbers like `3000` or `v2` in multiple locations.
2.  **Audit Component Defaults**: Review `src/engine/components/*.ts` to move hardcoded constants into `PhysicsConstants.ts` or a per-domain registry where appropriate to allow for easier tuning of simulation parameters.
3.  **Strict Typing**: Ensure all constants are documented with units (as some already are, e.g., `_M`, `_DB`, `_KTS`) and that logic relying on them uses these named constants rather than literals.

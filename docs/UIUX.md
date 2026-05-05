


Here is a comprehensive UX/UI specification for the **War-Games Engine V3 (C:MO Professional Standard)**. 

Designing a UI for a scientific-grade tactical simulator requires a fundamental shift away from traditional "gaming" UI. The priority is **Information Density, Situational Awareness, and Analytical Precision**. The interface must handle thousands of entities, complex nested data (sensors, magazines, doctrine), and multi-domain layers without overwhelming the analyst.

---

# UX/UI Specification: War-Games Engine V3 (Pro Edition)

## 1. Design Philosophy & Core Principles
*   **Function Over Form:** No unnecessary animations, gradients, or "sci-fi" UI fluff. The aesthetic should mimic modern military C4I (Command, Control, Communications, Computers, and Intelligence) systems.
*   **High Information Density:** The user is an analyst or engineer. They need raw data, tables, and graphs. Use collapsible panels and tabbed interfaces to manage density.
*   **Non-Blocking Interactions:** The user must be able to inspect a unit's radar cross-section, change ROE, and plot a 3D waypoint path while the simulation is running or paused, without modal windows blocking the screen.
*   **Decoupled UI (ECS Alignment):** The UI is a pure "Viewer" of the ECS state. User actions in the UI do not mutate state; they generate `Command` intents that are sent to the engine's Resolver.

---

## 2. Overall Screen Layout (The Workspace)
The workspace utilizes a classic, highly efficient 4-pane analytical layout.

### 2.1. Top Ribbon: Global Controls & Overlays
*   **File/Scenario:** Load, Save, Import DB, Export Telemetry.
*   **Time Controls:** Play, Pause, Step (1 tick), Time Compression (1x, 2x, 5x, 15x, 60x, 300x).
*   **Map Overlays Toggle:** Quick toggles for Radar Coverage Rings, Weapon Engagement Zones (WEZ), Sonar Convergence Zones, Weather/Cloud layers, and Bathymetry.
*   **Global EMCON/Doctrine:** Quick-access buttons to set global or side-wide Emissions Control (e.g., "All Ships Radar SILENT").

### 2.2. Center Viewport: The Tactical Globe (WebGL)
*   **The Core:** A seamless 3D virtual globe (e.g., CesiumJS or custom WebGL) that can transition from a global satellite view down to a 6-DOF 3D tactical view of a single missile intercept.
*   **Symbology:** Strict adherence to **MIL-STD-2525D** or **NTDS (Naval Tactical Data System)**. 
    *   *Blue:* Friendly, *Red:* Hostile, *Green:* Neutral, *Yellow:* Unknown.
    *   *Shapes:* Half-circle (Surface), Diamond (Air), U-shape (Subsurface).
*   **Vectors & Tethers:** Selected units display velocity vectors (length indicating speed) and targeting tethers (dashed lines showing who is targeting whom).

### 2.3. Left Panel: Order of Battle (OOB) & Scenario Tree
*   **Hierarchical Tree View:** Displays all friendly units, grouped by Task Force, Squadron, or Base.
*   **Contact List:** A separate tab showing all currently held sensor tracks (Unknowns, Hostiles), sortable by threat level, speed, or altitude.
*   **Multi-Select:** Shift/Ctrl-clicking OOB nodes allows bulk commanding (e.g., selecting an entire Carrier Strike Group to change course).

### 2.4. Right Panel: Unit Detail & Command (The Inspector)
*Context-sensitive. Populates when a unit or track is selected.*
*   **Header:** Unit Name, Class, Damage % (HP bar), Fuel Status.
*   **Tab 1: Kinematics:** Exact Altitude, Speed (Knots/Mach), Heading, Pitch/Roll (if in 3D view).
*   **Tab 2: Sensors (EMCON):** List of all radars, sonars, and ESM. Checkboxes to toggle Active/Passive states individually.
*   **Tab 3: Weapons & Magazines:** Visual representation of mounts (e.g., VLS cells). Shows weapon type, quantity, and readiness state.
*   **Tab 4: Doctrine & ROE:** Dropdowns for Weapons Free/Tight/Hold, Ignore Plotted Course when Attacked, etc.
*   **Tab 5: Damage Control:** Component-level damage list (e.g., "AN/SPY-1 Radar: DESTROYED", "Port Engine: FIRE").

### 2.5. Bottom Panel: Telemetry, Logs & Timeline
*   **Message Log:** A scrolling, color-coded text log of all events (e.g., `[14:32:01] [SENSORS] USS Arleigh Burke detects new AIR contact (Skunk #104)`).
*   **Flight Recorder / Graphing:** A timeline view where analysts can drag and drop variables (e.g., Missile Velocity vs. Target Altitude) to view real-time line graphs of the ECS data.

---

## 3. Interaction Paradigms & Workflows

### 3.1. Navigation & Waypoints
*   **Plotting:** User selects a unit, presses `F3` (standard hotkey for course plotting), and clicks on the map.
*   **3D Waypoints:** Each waypoint node on the map can be clicked to open a micro-menu to set specific parameters for that leg of the journey:
    *   *Speed:* Creep, Cruise, Flank, or specific Knots.
    *   *Altitude/Depth:* Terrain Following, High Alt, Periscope Depth.
    *   *Sensor State:* "Turn on radar when reaching this waypoint."

### 3.2. Targeting & Engagement
*   **Manual Engagement:** User selects friendly unit, presses `F1` (Attack), cursor turns into a crosshair, user clicks hostile track.
*   **Weapon Allocation Dialog (WAD):** Clicking a target opens the WAD. This is a critical UI component. It shows:
    *   Target details (Range, Speed, ECM environment).
    *   Available weapons on the firing platform.
    *   Probability of Kill (Pk) estimates.
    *   User manually allocates *X* number of weapons and clicks "Fire". (Generates a `FireWeaponCommand`).

### 3.3. The "God's Eye" vs. "Unit's Eye" View
*   **Truth View (God's Eye):** Used by scenario designers. Shows exact positions of all entities, regardless of sensor detection.
*   **Side View (Unit's Eye):** Used during simulation. The UI *only* renders what the selected Side's `SharedTrackComponent` (the Common Operating Picture) knows. Enemy submarines are invisible unless actively tracked by a friendly sonar.

---

## 4. Advanced Analytical UI Features (The "Pro" Tools)

### 4.1. The EM Spectrum Viewer
*   A specialized 2D graph overlay that visualizes the Electronic Warfare environment.
*   **X-Axis:** Frequency Bands (L, S, C, X, Ku).
*   **Y-Axis:** Signal Strength / Noise Floor.
*   **Visuals:** Friendly radar emissions appear as spikes. Enemy jamming appears as broad "noise" blocks raising the floor, visually demonstrating why a radar is failing to detect a target.

### 4.2. Weapon Engagement Zone (WEZ) Dynamic Shading
*   Instead of static circles, the map draws dynamic, amoeba-like polygons around units representing their true WEZ.
*   The UI queries the `AeroSystem` and `KinematicsComponent` to draw a WEZ that shrinks if the target is flying away at Mach 2, and expands if the target is flying toward the launcher.

### 4.3. Database (DB3000) Viewer
*   A built-in, Wikipedia-style browser accessible at any time.
*   Allows the user to right-click any unit (even an enemy track) and select "View DB Entry" to read its exact RCS values, thermal signatures, and kinematic limits.

---

## 5. Accessibility, Theming & Performance

### 5.1. Color Palettes
*   **Tactical Dark (Default):** Deep navy/black backgrounds, high-contrast neon symbology (Cyan for friendly, Red for hostile). Reduces eye strain during long analysis sessions.
*   **Chart Light:** White/light-blue background mimicking traditional paper nautical charts.
*   **Colorblind Modes:** Protanopia/Deuteranopia modes that shift the Red/Green/Blue symbology to distinct shapes and high-contrast patterns (e.g., using dashed borders for hostile tracks instead of just relying on the color red).

### 5.2. UI Performance (Handling 10,000+ Entities)
*   **Canvas/WebGL Rendering:** The tactical map cannot use DOM elements (like HTML `<div>` or SVG) for unit icons. It must use WebGL instanced rendering or HTML5 Canvas to maintain 60FPS while rendering thousands of missile tracks and sensor rings.
*   **Virtualization:** The OOB Left Panel and Bottom Message Log must use virtualized lists (e.g., `react-window`) so only the visible rows are rendered in the DOM.
*   **Throttled State Updates:** While the ECS engine might tick at 100Hz (0.01s) for physics accuracy, the UI state should only poll/update at 10Hz to 30Hz to prevent CPU bottlenecking on the frontend.

---

## 6. Summary of Key Hotkeys (Standardized for Muscle Memory)
*   `F1`: Engage Target (Auto-allocate weapons based on Doctrine).
*   `Shift + F1`: Open Weapon Allocation Dialog (Manual fire).
*   `F2`: Throttle / Altitude menu.
*   `F3`: Plot Course.
*   `F9`: Sensors / EMCON menu.
*   `F11`: Doctrine & ROE menu.
*   `V`: Toggle God's Eye vs. Side View.
*   `Keypad +/-`: Time compression up/down.

## 7. Map Data Ingestion (PNG to WGT)
The V3 engine uses a high-performance binary grid format (.wgt) for terrain and bathymetry. This data is derived from structured OSINT imagery.

### 7.1. Ingestion Pipeline
1.  **Source Imagery:** Grayscale PNG files (`land.png`, `ocean.png`).
2.  **Mapping Logic:**
    *   **Land:** Pixel values (0-255) are linearly mapped to elevation in meters based on `metadata.json` (`minElevation` and `maxElevation`).
    *   **Ocean:** Pixel values (0-255) are mapped to depth (negative meters).
3.  **Tile Generation:** The `ingest-terrain` CLI tool processes these images and generates 1°x1° tiles (e.g., `N34W118.wgt`).
4.  **Runtime Access:** The `TileManager` utilizes an LRU cache to load these binary `Float32Array` chunks into memory for line-of-sight and sonar propagation calculations.

## 8. PixiJS Tactical Map Implementation
To achieve the requirement of rendering 10,000+ entities at 60FPS, the engine utilizes **PixiJS** for the primary tactical display.

### 8.1. Why PixiJS?
*   **WebGL/WebGPU Batching:** PixiJS automatically batches sprites and geometry, reducing draw calls which is critical for thousands of tactical symbols.
*   **Viewport Management:** Uses `pixi-viewport` for performant panning, zooming, and world-to-screen coordinate mapping.
*   **Custom Shaders:** Allows for high-performance rendering of dynamic sensor coverage rings and Weapon Engagement Zones (WEZ) using GPU-side calculations.

### 8.2. Implementation Strategy
*   **Instanced Rendering:** All MIL-STD-2525 symbols are loaded into a Texture Atlas and rendered via a single `ParticleContainer` or high-performance `Container` for maximum throughput.
*   **Vector Layers:** Map borders and grid lines are rendered as high-performance graphics primitives.
*   **Throttled Updates:** The PixiJS stage is updated at 30Hz, while the engine's physics tick at higher frequencies, ensuring smooth visual performance without overloading the main thread.

## 9. Tactical Layer System (Toggleable)
The professional edition supports a multi-layered tactical picture. Analysts can toggle these layers to isolate specific data points.

### 9.1. Perception & Sensor Layers
*   **Radar Coverage Rings:** Solid lines indicating the Rmax (Maximum Range) of all active radars.
*   **Sonar Convergence Zones (CZ):** Shaded "donuts" on the map representing areas of high sonar detection probability due to acoustic refraction.
*   **ESM Bearing Lines:** Infinite dashed lines radiating from a sensor toward an unknown emitter, representing a passive bearing-only track.
*   **Detection Confidence Polygons:** Faded circles (CEPs) representing the uncertainty of a track's position.

### 9.2. Engagement & Combat Layers
*   **Weapon Engagement Zones (WEZ):** Dynamic, non-circular polygons showing the true reach of missiles against the selected target.
*   **Engagement Tethers:** Dashed lines connecting shooters to their targets, color-coded by weapon status (e.g., Orange for "In Flight", White for "Locked").
*   **Threat Envelopes:** A "Heat Map" overlay showing the combined weapon reach of all known hostile units.

### 9.3. Environmental & Physical Layers
*   **Bathymetry (Sea Floor):** A color-coded depth map (Blue to Black) derived from PNG ingestion.
*   **Cloud Cover & Precipitation:** Semi-transparent white/gray overlays affecting visual and IR sensor performance.
*   **Thermal Layers (XBT):** A side-panel or cross-section overlay showing water temperature depth (thermoclines), critical for submarine warfare.
*   **Political Borders / EEZ:** High-contrast vector lines showing maritime borders and Exclusive Economic Zones.
*   **The Grid (MGRS/LATLON):** A coordinate reference grid that scales with zoom level.
# War-Games UI (WGUI) Technical Guide

This document explains the technical architecture, state management, and component model of the War-Games V3 user interface.

## 1. Overview
WGUI is a custom, zero-dependency frontend framework built with vanilla TypeScript and CSS. It is designed for extreme performance in data-dense tactical simulations, prioritizing direct DOM manipulation over the overhead of a Virtual DOM.

### Key Technologies
- **Vanilla TypeScript**: Logic and component lifecycle.
- **Pixi.js**: High-performance WebGL rendering for the tactical map.
- **CSS Grid & Variables**: Layout and dynamic theming.
- **WebSockets**: Real-time bidirectional communication with the simulation engine.

---

## 2. Core Architecture: Unidirectional Data Flow

The UI follows a strict unidirectional flow to ensure consistency between the engine and the viewer:

1.  **Engine Update**: The backend simulation processes a tick and broadcasts a `VIEW_STATE` via WebSockets.
2.  **State Hydration**: `UIStore` receives the JSON payload and updates reactive **Signals**.
3.  **Reactive Render**: UI Components subscribed to those Signals update specific DOM nodes (e.g., `textContent`) instantly.
4.  **User Intent**: When a user interacts (clicks map, drags slider), the UI dispatches a command via `CommandBus`.
5.  **Command Execution**: The engine receives the command, queues it for the next tick, and the cycle repeats.

---

## 3. State Management: Signals
Instead of re-rendering whole components, WGUI uses a **Signal** system.

### `Signal<T>`
A wrapper around a value that allows multiple subscribers. When `set()` is called, all subscribers are notified.
```typescript
// Example: Tracking selection
static readonly selectedEntityId = new Signal<string | null>(null);

// Subscribing in a component
this.subscribe(UIStore.selectedEntityId, (id) => {
    this.element.classList.toggle('is-selected', id === this.myId);
});
```

---

## 4. The Component Model
All UI elements extend the base `Component` class (`src/ui/framework/Component.ts`).

### Lifecycle
1.  **Constructor**: Creates the root element (`this.element`).
2.  **render()**: Builds the static HTML structure (run once).
3.  **mount()**: Appends to the DOM and calls `onMount()`.
4.  **onMount()**: Sets up Signal subscriptions and event listeners.
5.  **unmount()**: Removes from DOM and automatically cleans up all subscriptions to prevent memory leaks.

---

## 5. Main UI Components

### 5.1. Tactical Workspace
The main container for the simulation view, defined in `src/ui/views/TacticalWorkspace/`:
- **LeftPanelOOB**: Hierarchical list of friendly units and detected contacts.
- **RightPanelInspector**: Detailed data for the selected entity (Kinematics, Weapons, Sensors).
- **BottomPanelLogs**: Real-time telemetry and combat message feed.
- **MapOverlay**: The Pixi.js viewport rendering the tactical globe.
- **Ribbon**: Top bar for time controls and overlay toggles.

### 5.2. Widgets
Found in `src/ui/components/widgets/`, these handle specific tactical tasks:
- **WeaponAllocationMatrix**: Assigning mounts to targets.
- **SpeedAltitudeSlider**: Direct kinematic control override.
- **FormationEditor**: Visual offset management for groups.
- **EMCONMatrix**: Per-sensor emission control.

---

## 6. High-Performance Patterns

### Pixi.js Integration
The tactical map is rendered in a dedicated `Canvas` layer. Pixi.js handles thousands of unit icons, radar rings, and vectors at 60FPS. The UI overlay (HTML/CSS) sits on top of this canvas.

### Throttled Updates
While the engine might broadcast at 10Hz or more, the UI uses `requestAnimationFrame` and Signal-based dirty-checking to ensure that DOM updates only happen when data actually changes.

### CSS Tokens
All styling is driven by CSS Variables in `index.css`. This allows the UI to scale across different display densities and support "Tactical Dark" or "High Contrast" modes without re-rendering.

---

## 7. Communication: CommandBus
All UI-to-Engine communication passes through the `CommandBus` (`src/ui/framework/CommandBus.ts`).
- **Commands**: Encapsulated JSON objects (e.g., `{ type: 'SetCourse', ... }`).
- **Match Management**: Handles joining specific match IDs and side selection (Blue/Red).
- **Socket Lifecycle**: Automatically handles reconnection and error logging.

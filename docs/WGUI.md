


Here is the complete, detailed specification for **WGUI (War-Games UI)**, a custom, zero-dependency, vanilla TypeScript and CSS framework designed specifically for a high-performance, data-dense Single Page Application (SPA) tactical simulator.

---

# WGUI Framework Specification
**Version:** 1.0
**Architecture:** Vanilla TypeScript, CSS3, HTML5
**Design Paradigm:** Unidirectional Data Flow, Signal-Based Reactivity, Direct DOM Manipulation.

## 1. Core Philosophy
1.  **Zero Virtual DOM:** VDOM diffing (like React) is too slow for 10,000+ rapidly changing telemetry points. WGUI uses direct, targeted DOM updates.
2.  **Strict Memory Management:** In a vanilla SPA, memory leaks are fatal. Every component must have a strict `mount` and `unmount` lifecycle to garbage-collect event listeners and state subscriptions.
3.  **Decoupled from Engine:** The UI runs in the main thread (or a separate worker) and only reads a synchronized "View State." It never mutates engine state directly; it only dispatches `Commands`.
4.  **CSS-Driven Layout:** JavaScript should never calculate layout (widths, heights, flex). All layout is handled by CSS Grid/Flexbox and CSS Variables.

---

## 2. State Management: The Signal System
At the heart of WGUI is a reactive Signal system. Instead of re-rendering a whole component when data changes, Signals update only the specific DOM text node or attribute that changed.

### 2.1. `Signal<T>` (Mutable State)
Holds a value and notifies subscribers when it changes.
```typescript
export class Signal<T> {
    private value: T;
    private subscribers: Set<(val: T) => void> = new Set();

    constructor(initial: T) { this.value = initial; }
    
    get(): T { return this.value; }
    
    set(newVal: T) {
        if (this.value !== newVal) {
            this.value = newVal;
            this.subscribers.forEach(fn => fn(newVal));
        }
    }

    subscribe(fn: (val: T) => void): () => void {
        this.subscribers.add(fn);
        fn(this.value); // Immediate execution
        return () => this.subscribers.delete(fn); // Returns unsubscribe function
    }
}
```

### 2.2. `Computed<T>` (Derived State)
Automatically recalculates when its dependent Signals change. Useful for formatting data (e.g., converting raw meters/sec to Knots for the UI).

### 2.3. The Global UI Store
The SPA maintains a singleton `UIStore` containing global signals:
*   `UIStore.selectedEntityId: Signal<string | null>`
*   `UIStore.timeCompression: Signal<number>`
*   `UIStore.activePanel: Signal<'OOB' | 'DB' | 'LOGS'>`

---

## 3. The Component Model
Every piece of the UI (a button, a panel, a list item) extends the base `Component` class. 

### 3.1. Base Component Class
```typescript
export abstract class Component {
    public readonly element: HTMLElement;
    protected cleanupTasks: Array<() => void> =[];

    constructor(tagName: string, className?: string) {
        this.element = document.createElement(tagName);
        if (className) this.element.className = className;
    }

    // 1. Build the static HTML structure once
    protected abstract render(): void;

    // 2. Attach event listeners and subscribe to Signals
    public mount(parent: HTMLElement): void {
        this.render();
        parent.appendChild(this.element);
        this.onMount();
    }

    protected onMount(): void {}

    // 3. Helper to auto-cleanup signal subscriptions
    protected subscribe<T>(signal: Signal<T>, callback: (val: T) => void) {
        const unsub = signal.subscribe(callback);
        this.cleanupTasks.push(unsub);
    }

    // 4. Destroy the component and prevent memory leaks
    public unmount(): void {
        this.cleanupTasks.forEach(task => task());
        this.cleanupTasks =[];
        this.element.remove();
        this.onUnmount();
    }

    protected onUnmount(): void {}
}
```

### 3.2. Example: High-Performance Telemetry Panel
Notice how `innerHTML` is **never** used during updates. We update the `textContent` of specific spans.

```typescript
export class TelemetryPanel extends Component {
    private speedSpan: HTMLSpanElement;
    private altSpan: HTMLSpanElement;

    constructor(private entityId: string) {
        super('div', 'panel telemetry-panel');
        
        // Create DOM nodes once
        this.element.innerHTML = `
            <div class="row">Speed: <span class="val-speed"></span> kts</div>
            <div class="row">Alt: <span class="val-alt"></span> ft</div>
        `;
        this.speedSpan = this.element.querySelector('.val-speed')!;
        this.altSpan = this.element.querySelector('.val-alt')!;
    }

    protected onMount() {
        // Assume EngineBridge provides signals for entity telemetry
        const telemetry = EngineBridge.getTelemetrySignals(this.entityId);
        
        this.subscribe(telemetry.speed, (speed) => {
            this.speedSpan.textContent = speed.toFixed(1);
        });
        
        this.subscribe(telemetry.altitude, (alt) => {
            this.altSpan.textContent = alt.toFixed(0);
        });
    }
}
```

---

## 4. SPA Routing & View Management
Since this is a simulator, we don't need complex URL routing (like `/dashboard/user/1`). We need a **View Manager** that swaps out top-level components.

*   **Views:** `MainMenu`, `ScenarioLoader`, `TacticalWorkspace`, `Debriefing`.
*   **Implementation:** The `App` class holds a `root` div. When the state changes from `MENU` to `TACTICAL`, it calls `currentView.unmount()`, instantiates the new view, and calls `newView.mount(root)`.

---

## 5. High-Performance UI Patterns

### 5.1. The Render Loop (Throttling)
The ECS engine ticks at 100Hz. The UI should only update at 30Hz or 60Hz.
*   **Solution:** The Engine writes to a shared memory buffer or state object. The UI runs a `requestAnimationFrame` (rAF) loop. On each frame, the UI reads the latest state and updates its Signals.

### 5.2. DOM Virtualization (The Order of Battle List)
If a scenario has 5,000 units, rendering 5,000 `<div>` elements in the Left Panel will crash the browser.
*   **Solution:** Implement a `VirtualList` component.
*   It creates a scrollable container with a massive inner height (e.g., `5000 * 24px = 120,000px`).
*   It only creates enough DOM elements to fill the visible viewport (e.g., 40 rows).
*   As the user scrolls, it updates the `transform: translateY` of those 40 rows and swaps their text content.

### 5.3. The Tactical Map (Canvas/WebGL)
The center viewport is **not** HTML/CSS. It is a dedicated `CanvasComponent`.
*   The UI framework simply provides a `<canvas id="tactical-map">` element.
*   A separate WebGL renderer (or Canvas 2D API) takes over this element, drawing the map, unit icons, and WEZ rings directly from the engine's spatial grid.

---

## 6. CSS Architecture & Theming

Use strict naming conventions (BEM - Block Element Modifier) and CSS Variables for a clean, maintainable stylesheet.

### 6.1. CSS Variables (Design Tokens)
Define all colors, spacing, and typography at the `:root` level. This allows instant switching between "Dark Tactical" and "Light Chart" modes.

```css
/* src/ui/styles/theme.css */
:root {
    /* Colors */
    --bg-base: #0a0e17;
    --bg-panel: #121826;
    --border-color: #2a3441;
    --text-main: #e2e8f0;
    --text-muted: #64748b;
    
    /* Tactical Symbology */
    --color-friendly: #00e5ff;
    --color-hostile: #ff3366;
    --color-neutral: #00ff66;
    --color-unknown: #ffcc00;

    /* Typography */
    --font-mono: 'JetBrains Mono', 'Courier New', monospace;
    --font-ui: 'Inter', sans-serif;
}[data-theme="light"] {
    --bg-base: #f1f5f9;
    --bg-panel: #ffffff;
    /* ... inverted colors ... */
}
```

### 6.2. Layout System (CSS Grid)
The main workspace layout is defined entirely in CSS, not JavaScript.

```css
/* src/ui/styles/layout.css */
.workspace {
    display: grid;
    grid-template-columns: 300px 1fr 350px;
    grid-template-rows: 40px 1fr 200px;
    grid-template-areas:
        "header header header"
        "left-panel map right-panel"
        "bottom-panel bottom-panel right-panel";
    height: 100vh;
    width: 100vw;
    overflow: hidden;
}

.panel-left { grid-area: left-panel; }
.panel-right { grid-area: right-panel; }
.viewport-center { grid-area: map; }
```

---

## 7. Event Handling & Engine Communication

The UI must never mutate the engine state. It uses an **Event Bus** to send intents.

```typescript
// src/ui/framework/CommandBus.ts
export class CommandBus {
    static dispatch(command: EngineCommand) {
        // Pushes the command to the Engine's input queue
        Engine.queueCommand(command);
    }
}

// Usage in a UI Component (e.g., Weapon Allocation Button)
fireButton.addEventListener('click', () => {
    CommandBus.dispatch({
        type: 'FIRE_WEAPON',
        shooterId: this.selectedUnitId,
        targetId: this.targetId,
        weaponId: 'AIM-120D'
    });
});
```

---

## 8. Directory Structure

A clean, scalable folder structure for the SPA:

```text
src/
├── engine/                 # The ECS Simulation Engine (V3)
├── ui/                     # The SPA Frontend
│   ├── framework/          # The WGUI Core
│   │   ├── Component.ts    # Base class
│   │   ├── Signal.ts       # State management
│   │   ├── VirtualList.ts  # High-perf list rendering
│   │   └── CommandBus.ts   # UI -> Engine bridge
│   ├── components/         # Reusable UI widgets
│   │   ├── Button.ts
│   │   ├── Tabs.ts
│   │   └── TreeView.ts
│   ├── views/              # Top-level SPA screens
│   │   ├── MainMenu/
│   │   └── TacticalWorkspace/
│   │       ├── LeftPanelOOB.ts
│   │       ├── RightPanelInspector.ts
│   │       └── BottomPanelLogs.ts
│   ├── styles/             # CSS
│   │   ├── reset.css
│   │   ├── theme.css       # CSS Variables
│   │   ├── layout.css      # Grid definitions
│   │   └── components.css  # Specific widget styles
│   └── App.ts              # SPA Entry point & View Manager
└── index.html              # The single HTML file
```

## 9. Summary of Workflow for Adding a New UI Feature
1.  **Define State:** Add a `Signal` to the `UIStore` or Engine Bridge.
2.  **Create Component:** Extend `Component`. Write the HTML structure in `render()`.
3.  **Bind Data:** In `onMount()`, `subscribe()` to the Signal and update the specific `HTMLElement.textContent` or `classList`.
4.  **Add Interaction:** Add an `addEventListener` that calls `CommandBus.dispatch()`.
5.  **Style:** Add BEM-compliant CSS using global CSS variables.
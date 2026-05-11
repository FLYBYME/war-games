# WarGames UI Specification (V3)

## 1. Vision & Aesthetics
The WarGames UI is a **Tactical Command Center**. It must feel premium, reactive, and high-stakes.
*   **Theme**: Deep dark backgrounds (`#0a0a0c`) with vibrant tactical accents (Cyan for Blue-for, Amber for Red-for, Terminal Green for status).
*   **Feel**: Glassmorphism, subtle micro-animations on hover, and monospaced typography for data-heavy views.
*   **Constraint**: No "Generic" HTML elements. Every component must be wrapped in a `ui-lib` class to ensure consistent styling.

## 2. Architectural Layers

### Layer 1: UI Library (`src/client/ui-lib`)
*   **Rule**: Must be **Domain-Blind**. 
*   **Responsibility**: Primitive layout units (`Row`, `Column`), Typography (`Text`, `Heading`), and Widgets (`Button`, `Modal`).
*   **Data**: Receives data via strictly typed `props`. Never fetches its own data.

### Layer 2: Core IDE (`src/client/core`)
*   **Responsibility**: The Workbench Shell. Manages the Grid, Activity Bar, Command Registry, and Extension Host.
*   **State**: Provides global services (Theme, Notifications, Layout).

### Layer 3: Extensions (`src/client/extensions`)
*   **Responsibility**: **Domain Features** (e.g., Tactical Map, Entity Inspector).
*   **State**: Uses **Services** to bridge simulation data to the UI.
*   **Pattern**: Registers `ViewProviders` that compose `ui-lib` components.

### Layer 4: Services (`src/client/core/services`)
*   **Responsibility**: **Headless Domain Logic**.
*   **Examples**: `MatchService`, `SimStreamService`, `SelectionService`.
*   **Pattern**: Wraps the SDK, manages network state (streaming/polling), and exposes state via `Signals`.

## 3. Data Flow (The "Passive UI" Pattern)
We use a **Push-based** reactivity model.
1.  **SDK Client**: Low-level generated client from tool contracts.
2.  **Domain Service**: Orchestrates SDK calls and holds data in a `Signal<T>`.
3.  **Extension**: Subscribes to Service signals.
4.  **UI Component**: Receives values via `updateProps()` and re-renders.

## 4. The Match Context (Core Pillar)
The `MatchService` is the foundational execution context.
*   **Explicit Context**: Extensions retrieve `matchId` and `side` from the service to pass to SDK calls.
*   **Lifecycle**: The UI remains in a "Staging" state until a match is selected, at which point the `MatchService` emits an activation event.


## 4. Standard Workbench Layout
The layout uses a CSS Grid system managed by `LayoutManager`:
*   **Header**: Global menus and app title.
*   **Activity Bar**: Primary navigation icons (Left/Right/Bottom).
*   **Sidebars**: Context-specific views (Entity lists, Project tools).
*   **Editor/Center**: The primary workspace (Tactical Map or Code Editor).
*   **Bottom Panel**: High-frequency data (Logs, Terminal, Metrics).
*   **Status Bar**: Global simulation health and breadcrumbs.

## 5. Core Views (Feature Modules)

These views are registered via Extensions and represent the primary functional areas of the simulation.

### 5.1 Match Explorer (Primary Sidebar)
*   **Purpose**: Browsing and initializing simulation matches.
*   **Key Interaction**: Double-clicking a match in the list triggers `MatchService.selectMatch(id)`, which updates the global `currentMatch` signal.
*   **Components**: `uiLib.Tree`, `uiLib.Input` (Filter), `uiLib.Button` (New Match).

### 5.2 Tactical Map (Center Panel)
*   **Purpose**: Real-time spatial visualization of the simulation state.
*   **Technology**: WebGL / Canvas-based renderer wrapped in a `ViewProvider`.
*   **Data Binding**: Subscribes to the `EntityService` to update positions of unit icons at 60fps.
*   **Overlays**: Weapon Engagement Zones (WEZ), Sensor Ranges, and Navigation Waypoints.

### 5.3 Entity Inspector (Secondary Sidebar)
*   **Purpose**: Deep-dive into a specific entity's subsystems (Kinematics, Sensors, Logistics).
*   **Context**: Populates when an entity is selected on the Tactical Map.
*   **Interface**: Uses `uiLib.PropertyGrid` to display raw data inferred from Zod schemas (e.g., `LogisticsStateSchema`).

### 5.4 Simulation Controls (Status Bar / Toolbar)
*   **Purpose**: Controlling the "flow" of time.
*   **Actions**: `Step`, `Pause`, `Play`, `Reset`.
*   **Speed Control**: A slider or dropdown to set the simulation tick rate (e.g., 1x, 5x, Real-time).

## 6. Command & Interaction System

The IDE uses a **Centralized Command Registry** to ensure parity between UI clicks, Keyboard Shortcuts, and AI Agent actions.

### 6.1 Command Pattern
Every action must be registered as a Command:
```typescript
ide.commands.register({
    id: 'sim.pause',
    label: 'Pause Simulation',
    icon: 'fas fa-pause',
    handler: () => matches.pause()
});
```

### 6.2 Shortcut Mapping
Commands are mapped to keys in `src/client/core/ShortcutManager.ts`.
*   `Space`: Toggle Play/Pause.
*   `Ctrl + S`: Save Match State.
*   `G`: Toggle Grid Overlays.

## 7. Extension API (Interface for New Features)

Extensions must implement the `Extension` interface and use the `ExtensionContext` to register their capabilities:

```typescript
export interface Extension {
    id: string;
    name: string;
    activate(context: ExtensionContext): void;
    deactivate?(): void;
}
```

Capabilities include:
*   `registerView(provider: ViewProvider)`: Add a new UI panel.
*   `registerCommand(command: Command)`: Add a new action.
*   `registerSetting(setting: Setting)`: Add a user-configurable option.
## 8. Advanced UI Patterns

### 8.1 Schema-Driven UI Generation
With 100+ tools defined via Zod, the UI utilizes **Dynamic Form Generation**:
*   **Zod Reflectors**: Components that can take a Zod `inputSchema` and automatically render the corresponding `ui-lib` inputs.
*   **Context Injection**: The generator automatically populates fields like `matchId` and `entityId` from global Services.
*   **Parity**: This ensures that every tool available to the AI Agent is also instantly available to the User via a "Command Launcher" or "Debug View".

### 8.2 Multiplexed Streaming
To prevent multiple network connections for the same match:
*   **Single Connection**: The `SimStreamService` maintains exactly one HTTP/WS stream per `matchId`.
*   **Internal Multicasting**: As events arrive (e.g., `ENTITY_MOVED`), the service pushes them to all subscribed UI components.
*   **Reference Counting**: The service automatically closes the server-side stream when the last UI component unmounts.

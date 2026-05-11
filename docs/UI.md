# WarGames UI Specification & Roadmap (V3)

> This document defines the architecture, patterns, and implementation roadmap for the WarGames
> client-side user interface. It is the single source of truth for how UI code is structured,
> how data flows from the simulation server to the screen, and how new features are added.

---

## 1. Vision & Aesthetics

The WarGames UI is a **Tactical Command Center**, not a generic code editor.
It must feel premium, reactive, and high-stakes — like military COP (Common Operating Picture) software.

### 1.1 Color System
| Token             | Value              | Usage                                       |
| :---------------- | :----------------- | :------------------------------------------- |
| `--bg-primary`    | `#0a0a0c`          | Root background, deepest layer               |
| `--bg-panel`      | `#1e1e1e`          | Panel surfaces                               |
| `--bg-sidebar`    | `#252526`          | Sidebars, secondary surfaces                 |
| `--bg-input`      | `#2d2d30`          | Input fields, interactive wells              |
| `--border`        | `#3e3e42`          | Panel dividers, subtle separators            |
| `--accent`        | `#007acc`          | Primary interactive elements                 |
| `--blue-force`    | `#00bcd4` (Cyan)   | Blue side entities, friendly units           |
| `--red-force`     | `#ff9800` (Amber)  | Red side entities, hostile units             |
| `--status-ok`     | `#4caf50` (Green)  | Healthy systems, successful operations       |
| `--status-warn`   | `#ff9800` (Amber)  | Degraded systems, caution states             |
| `--status-crit`   | `#f44336` (Red)    | Destroyed, failed, critical alerts           |
| `--text-main`     | `#cccccc`          | Primary readable text                        |
| `--text-muted`    | `#888888`          | Labels, secondary information                |

### 1.2 Typography
- **UI Text**: Inter or system sans-serif (`-apple-system, BlinkMacSystemFont, "Segoe UI"`).
- **Data / Telemetry**: Monospaced (`JetBrains Mono`, `Fira Code`, or system monospace).
- **Base Size**: `13px` for UI, `12px` for dense data grids.

### 1.3 Visual Principles
- **Glassmorphism**: Subtle `backdrop-filter: blur()` on floating panels and overlays.
- **Micro-animations**: `150ms ease` transitions on hover, focus, and state changes.
- **No generic HTML**: Every visible element must use a `ui-lib` component. Raw `<div>` with inline styles is forbidden in extension code.

---

## 2. Architectural Layers

The UI is split into four strict layers. Each has clear responsibilities and import restrictions.

```
┌─────────────────────────────────────────────────────┐
│  Layer 4: Services          (Headless domain logic) │
│  MatchService, SimStreamService, SelectionService   │
├─────────────────────────────────────────────────────┤
│  Layer 3: Extensions        (Domain features)       │
│  MatchExtension, MapExtension, EntityExtension      │
├─────────────────────────────────────────────────────┤
│  Layer 2: Core IDE          (Workbench shell)       │
│  LayoutManager, CommandRegistry, ExtensionManager   │
├─────────────────────────────────────────────────────┤
│  Layer 1: UI Library        (Domain-blind widgets)  │
│  Button, Column, Modal, TextInput, Table, Card      │
└─────────────────────────────────────────────────────┘
```

### Layer 1: UI Library (`src/client/ui-lib`)
- **Rule**: Must be **domain-blind**. No import from `@sdk`, no mention of "match," "entity," or "simulation."
- **Responsibility**: Primitive building blocks — layout (`Row`, `Column`, `Stack`, `SplitView`), forms (`TextInput`, `Select`, `Slider`, `Switch`), data display (`Table`, `Card`, `Tag`), feedback (`Spinner`, `ProgressBar`, `Alert`), overlays (`Modal`, `ContextMenu`, `Drawer`), and navigation (`MenuBar`, `Breadcrumb`, `TreeItem`).
- **Data**: Receives data via strictly typed `props`. Never fetches its own data. Never subscribes to signals.
- **Existing inventory** (50+ components):
  - **Forms**: `Button`, `ButtonGroup`, `Checkbox`, `TextInput`, `TextArea`, `Select`, `Switch`, `RadioGroup`, `Slider`, `SearchInput`, `Pagination`, `ColorPicker`, `MultiSelectTagInput`, `PropertyGrid`, `FileUpload`, `DatePicker`
  - **Layout**: `Column`, `Row`, `Stack`, `Spacer`, `Divider`, `ScrollArea`, `Collapsible`, `SplitView`, `DockingSystem`, `Accordion`, `Carousel`
  - **Overlays**: `Modal`, `Popover`, `ContextMenu`, `ConfirmDialog`, `PromptDialog`, `FormDialog`, `QuickPickDialog`, `Drawer`
  - **Data**: `Card`, `Table`, `Tag`, `Avatar`
  - **Feedback**: `Badge`, `ProgressBar`, `Spinner`, `Tooltip`, `StepProgress`, `EmptyStateView`, `Alert`, `Skeleton`, `Icon`
  - **Navigation**: `Breadcrumb`, `BreadcrumbBar`, `Tab`, `TreeItem`, `VirtualList`, `MenuBar`, `TitleBar`, `Header`, `MenuItem`
  - **Panels**: `StatusBar`, `StatusBarItem`, `Toolbar`, `EditorTab`, `ActivityBarItem`
  - **IDE**: `NotificationToast`, `CodeBlock`, `KeybindingLabel`, `InlineEditWidget`

### Layer 2: Core IDE (`src/client/core`)
- **Responsibility**: The workbench shell. Manages the window grid, the activity bar, the command registry, the extension host, and global services.
- **State**: Provides global primitives: `ThemeService`, `NotificationService`, `LayoutManager`, `ShortcutManager`, `MonacoService`.
- **Key class**: `IDE` — the root object. Created once, passed to all services and extensions via `ExtensionContext`.
- **Import rule**: May import `ui-lib`. Must NOT import from `extensions/`.

### Layer 3: Extensions (`src/client/extensions`)
- **Responsibility**: Domain features. Each extension owns a vertical slice of the application (e.g., the Tactical Map, the Match Explorer, the Entity Inspector).
- **Pattern**: An extension implements the `Extension` interface (`id`, `name`, `version`, `activate`, `deactivate?`). On activation, it receives an `ExtensionContext` with access to the `IDE` instance and a `subscriptions` array for lifecycle cleanup.
- **Registration**: Extensions register `ViewProviders`, `Commands`, `Settings`, and `ActivityBar` items.
- **Import rule**: May import `ui-lib` and `core`. May import `@sdk` contracts for types. Must NOT import other extensions directly — use the `CommandRegistry` or `EventBus` for cross-extension communication.

### Layer 4: Services (`src/client/core/services`)
- **Responsibility**: Headless domain logic. These are the "brains" that sit between the SDK and the Extensions.
- **Pattern**: A service wraps the `WarGamesClientV2`, manages network state (polling, streaming, caching), and exposes reactive state via `Signal<T>`.
- **Import rule**: May import `@sdk`. Must NOT import `ui-lib` or `extensions/`.
- **Key services** (planned):

| Service               | Responsibility                                                  |
| :-------------------- | :-------------------------------------------------------------- |
| `MatchService`        | Active match context (`matchId`, `side`). Core lifecycle events. |
| `SimStreamService`    | Multiplexed event stream from the simulation server.            |
| `SelectionService`    | Currently selected entity/entities on the map.                  |
| `EntityCacheService`  | Client-side entity state cache, refreshed via stream events.    |

---

## 3. Data Flow (The "Passive UI" Pattern)

UI components are **passive mirrors**. They reflect data but never fetch it.

```
Server ──► SDK Client ──► Service (Signal<T>) ──► Extension (subscribe) ──► Component (updateProps)
```

### 3.1 The Flow in Practice
1. **SDK Client** (`WarGamesClientV2`): Low-level HTTP/SSE client generated from tool contracts. Knows nothing about UI state.
2. **Service** (e.g., `MatchService`): Calls the SDK, stores results in a `Signal<T>`. Manages refresh intervals, stream lifecycle, and error recovery.
3. **Extension** (e.g., `MatchExtension`): Subscribes to the service's signals during `activate()`. When data changes, it calls `component.updateProps(...)` with the new values.
4. **UI Component** (e.g., `StatusBarItem`): Receives new props, re-renders its DOM. Has zero knowledge of where the data came from.

### 3.2 Signal<T> — The Reactive Primitive
The `Signal<T>` class (`src/client/core/Signal.ts`) is the reactive glue:
```typescript
const matchSignal = new Signal<Match | null>(null);

// Subscribe — callback fires immediately with current value, then on every change.
const unsubscribe = matchSignal.subscribe((match) => {
    statusItem.updateProps({ text: match ? match.name : 'No Match' });
});

// Cleanup in extension's deactivate()
context.subscriptions.push({ dispose: unsubscribe });
```

### 3.3 Rules
- Components **never** call `fetch()`, `client.api.*()`, or `setTimeout()` for polling.
- Extensions **never** hold raw SDK response data in local variables. They push it into a Service signal or directly into component props.
- Services **never** touch the DOM.

---

## 4. The Match Context (Core Pillar)

The `MatchService` is the foundational execution context for the entire application.
Almost every SDK call requires a `matchId`, and many require a `side`.

### 4.1 Responsibilities
- Holds the active `matchId` and `side` as `Signal` values.
- Emits lifecycle events: `MATCH_SELECTED`, `MATCH_ACTIVATED`, `MATCH_DEACTIVATED`.
- Provides convenience accessors so extensions can read the current context explicitly.

### 4.2 UI Lifecycle States

| State         | Match Selected? | Description                                              |
| :------------ | :-------------- | :------------------------------------------------------- |
| **Staging**   | No              | App is loaded but no match is active. Most views are empty or show an `EmptyStateView`. |
| **Loading**   | Yes (loading)   | A match has been selected. Services are fetching initial state. Skeleton loaders visible. |
| **Active**    | Yes (ready)     | All data is available. Map renders, inspector populates, stream is live. |
| **Paused**    | Yes (paused)    | Simulation is paused. UI is fully populated but the stream is idle. |

### 4.3 Explicit Context, Not Magic
Extensions retrieve `matchId` and `side` from the service and pass them explicitly to SDK calls.
There is no automatic injection — every call site is traceable.

```typescript
// Inside an extension's activate():
const matchId = ide.matches.currentMatchId.get();
if (!matchId) return;

const entities = await ide.getClient().api.entity.list({ matchId });
```

---

## 5. Standard Workbench Layout

The layout is a CSS Grid managed by `LayoutManager`. All panels are resizable and togglable.

```
┌──────────────────────────────────────────────────────────┐
│                        Header                            │
├────┬─────────────────┬──────────────────────┬────┬───────┤
│ AB │   Left Sidebar  │   Center Panel       │ AB │ Right │
│    │   (Primary)     │   (Map / Editor)     │    │Sidebar│
│    │                 │                      │    │       │
├────┴────────┬────────┴──────────────────────┴────┴───────┤
│  Bottom AB  │          Bottom Panel                      │
│             │          (Logs / Terminal / Metrics)        │
├─────────────┴────────────────────────────────────────────┤
│                       Status Bar                         │
└──────────────────────────────────────────────────────────┘
AB = Activity Bar (icon strip for switching views within a panel)
```

### 5.1 Panel Ownership
- **Header**: Global menus (`MenuBar`), app title, and top-level actions.
- **Activity Bar**: Navigation icons registered by extensions. Clicking an icon tells the `ViewRegistry` to mount the corresponding `ViewProvider` into the panel's content area.
- **Left Sidebar**: Primary exploration views (Match Explorer, File Tree, DB Browser).
- **Center Panel**: The main workspace. In simulation mode, this is the Tactical Map. In development mode, this is the Monaco Editor.
- **Right Sidebar**: Contextual detail views (Entity Inspector, Properties, AI Chat).
- **Bottom Panel**: High-frequency output (Event Log, Terminal, Telemetry Charts).
- **Status Bar**: Global simulation health — current tick, match status, active side, connection indicator.

### 5.2 Status Bar Contract
The `StatusBar` is a **generic container**. It does not hardcode domain items.
- Extensions add items via `ide.layout.statusBar.addItem(id, props, position)`.
- The `MatchExtension` adds: `match-name`, `match-status`, `sim-tick`, `active-side`.
- Legacy IDE items (`branch`, `encoding`, `language`) should be removed or moved to a `DevToolsExtension`.

---

## 6. Core Views (Feature Modules)

Each view is registered by an Extension and mounted into a panel via a `ViewProvider`.

### 6.1 Match Explorer (Left Sidebar)
- **Extension**: `MatchExtension`
- **Purpose**: Browse, create, and select simulation matches.
- **Interaction**: Selecting a match updates `MatchService.currentMatchId`, which triggers the global lifecycle transition from Staging → Loading → Active.
- **Components**: `SearchInput` (filter), `VirtualList` (match list), `Button` (New Match), `ContextMenu` (Delete/Rename).

### 6.2 Tactical Map (Center Panel)
- **Extension**: `MapExtension` (already exists at `src/client/extensions/map/`)
- **Purpose**: Real-time 2D/3D spatial visualization of the battlespace.
- **Technology**: WebGL renderer (`MapRenderer`) with a layer system (`LayerRegistry`).
- **Layers**: Base map, entity icons (via `SymbologyService`), WEZ rings, sensor arcs, waypoint paths, tactical zones.
- **Data Binding**: Subscribes to `SimStreamService` for real-time entity position updates. Subscribes to `SelectionService` to highlight selected units.

### 6.3 Entity Inspector (Right Sidebar)
- **Extension**: `EntityExtension`
- **Purpose**: Deep-dive into a selected entity's subsystems.
- **Context**: Populates when an entity is selected on the Tactical Map (via `SelectionService`).
- **Subsystem Tabs**: Kinematics, Sensors, Combat, Navigation, Logistics, Propulsion, Guidance, Signature, EW.
- **Components**: `Tab` (subsystem switcher), `PropertyGrid` (data display), `Button` (actions like "Fire", "Set Waypoint").
- **Schema-driven**: Each subsystem tab can be auto-generated from the corresponding SDK contract's `outputSchema`.

### 6.4 Event Log (Bottom Panel)
- **Extension**: `EventLogExtension`
- **Purpose**: Chronological stream of simulation events (entity destroyed, weapon fired, detection gained/lost).
- **Data Binding**: Subscribes to `SimStreamService`.
- **Components**: `VirtualList` (high-performance scrolling), `Tag` (event type badges), `SearchInput` (filter).

### 6.5 Simulation Controls (Status Bar + Toolbar)
- **Extension**: `MatchExtension` (status bar items) + `SimControlExtension` (toolbar)
- **Actions**: Play, Pause, Step, Step-N, Reset. Registered as commands so they are accessible via keyboard shortcuts and the command palette.
- **Speed Control**: `Slider` or `Select` to set tick rate multiplier.

### 6.6 AI Agent Chat (Bottom Panel or Right Sidebar)
- **Extension**: `AgentExtension`
- **Purpose**: Interactive chat with AI agents that can invoke tools against the simulation.
- **Data Binding**: Uses `client.api.agent.run_stream()` to stream agent responses.
- **Components**: Message list, `TextArea` (input), `CodeBlock` (tool call display).

### 6.7 Tool Runner / Debug Console (Bottom Panel)
- **Extension**: `ToolRunnerExtension`
- **Purpose**: Manually invoke any of the 100+ tools with a generated form. Acts as a built-in "Postman" for the simulation API.
- **See**: Section 8.1 (Schema-Driven UI Generation).

---

## 7. Command & Interaction System

### 7.1 Command Pattern
Every user-facing action must be registered as a Command. This ensures parity between:
- A button click in the UI.
- A keyboard shortcut.
- An AI agent invoking a tool.
- A CLI command.

```typescript
ide.commands.register({
    id: 'sim.step',
    label: 'Step Simulation',
    handler: async () => {
        const matchId = ide.matches.currentMatchId.get();
        if (!matchId) return;
        await ide.getClient().api.sim.step({ matchId, ticks: 1 });
    }
});
```

### 7.2 Command Registry (`src/client/core/CommandRegistry.ts`)
- Commands are registered with `id`, `label`, and `handler`.
- The registry extends `EventBus`, so it doubles as the global pub/sub system.
- Commands can be executed programmatically: `ide.commands.execute('sim.step')`.

### 7.3 Shortcut Mapping
Managed by `ShortcutManager`. Default bindings:

| Shortcut        | Command                          |
| :-------------- | :------------------------------- |
| `Space`         | `sim.togglePlayPause`            |
| `N`             | `sim.step`                       |
| `Ctrl+Shift+P`  | `commandPalette.open`           |
| `Ctrl+B`        | `layout.togglePrimarySidebar`   |
| `Ctrl+Shift+B`  | `layout.toggleSecondarySidebar` |
| `Ctrl+J`        | `layout.toggleBottomPanel`      |
| `Escape`        | `selection.clear`               |
| `Delete`        | `entity.delete`                 |

### 7.4 EventBus (`src/client/core/EventBus.ts`)
The `CommandRegistry` uses an `EventBus` internally. Extensions can listen for cross-cutting events:
- `match:activated` — A match has been selected and is ready.
- `match:deactivated` — The active match was closed.
- `selection:changed` — The selected entity set changed.
- `sim:tick` — A new simulation tick was received from the stream.

---

## 8. Extension API

### 8.1 Extension Interface
```typescript
export interface Extension {
    id: string;            // e.g., 'wargames.match'
    name: string;          // e.g., 'Match Explorer'
    version: string;       // e.g., '1.0.0'
    activate(context: ExtensionContext): void | Promise<void>;
    deactivate?(): void | Promise<void>;
}
```

### 8.2 ExtensionContext
Provided to every extension on activation:
```typescript
export interface ExtensionContext {
    ide: IDE;                             // Access to all core services
    subscriptions: { dispose: () => void }[]; // Cleanup registry
    registerConfiguration: (node: ConfigurationNode) => void;
}
```

### 8.3 Capabilities
An extension can register:
- **Views**: `context.ide.views.register(location, provider)` — mount UI into a panel.
- **Activity Bar Items**: `context.ide.activityBar.registerItem(item)` — add navigation icons.
- **Commands**: `context.ide.commands.register(command)` — add executable actions.
- **Settings**: `context.registerConfiguration(node)` — add user-configurable options.
- **Status Bar Items**: `context.ide.layout.statusBar.addItem(id, props, position)`.

### 8.4 Lifecycle
1. Extensions are registered (statically imported or dynamically loaded via `loadFromUrl`).
2. `ExtensionManager.activateAll()` is called during IDE initialization.
3. Each extension's `activate()` runs, receiving its `ExtensionContext`.
4. On shutdown, `deactivate()` is called and all `subscriptions` are disposed.

### 8.5 Extension Roadmap

| Extension                | Priority | Panel           | Description                                     |
| :----------------------- | :------- | :-------------- | :---------------------------------------------- |
| `MatchExtension`         | P0       | Left Sidebar    | Match CRUD, lifecycle management, status bar     |
| `MapExtension`           | P0       | Center          | Tactical map renderer (exists, needs SDK wiring) |
| `EntityExtension`        | P0       | Right Sidebar   | Entity inspector with subsystem tabs             |
| `SimControlExtension`    | P0       | Toolbar/Status  | Play/Pause/Step controls                         |
| `EventLogExtension`      | P1       | Bottom          | Live simulation event stream                     |
| `ToolRunnerExtension`    | P1       | Bottom          | Schema-driven debug console (Section 9)          |
| `AgentExtension`         | P1       | Bottom/Right    | AI agent chat interface                          |
| `DBBrowserExtension`     | P2       | Left Sidebar    | Browse entity/weapon/scenario profiles           |
| `HistoryExtension`       | P2       | Center/Bottom   | Post-match analytics and telemetry replay        |
| `DevToolsExtension`      | P3       | Bottom          | Monaco editor, terminal (legacy IDE features)    |

---

## 9. Schema-Driven UI Generation

With 100+ tools defined via Zod contracts and a `globalContractRegistry`, the UI can
**automatically generate type-safe forms** for any tool.

### 9.1 The Zod-to-UI Mapper
A utility function that takes a Zod schema and returns `ui-lib` components:

| Zod Type               | UI Component      | Notes                              |
| :---------------------- | :----------------- | :--------------------------------- |
| `z.string()`           | `TextInput`        | With `.describe()` as placeholder  |
| `z.number()`           | `TextInput` (num)  | With min/max from `.min()`/`.max()`|
| `z.boolean()`          | `Switch`           |                                    |
| `z.enum([...])`        | `Select`           | Options from enum values           |
| `z.object({...})`      | `Collapsible` group| Recursive rendering                |
| `z.array(z.string())`  | `MultiSelectTagInput`|                                  |
| `z.optional(...)`      | Same + "optional" label |                              |

### 9.2 Context-Aware Fields
Certain field names are recognized as "system keys" and auto-populated from services:

| Field Name    | Source                        | UI Behavior                        |
| :------------ | :---------------------------- | :--------------------------------- |
| `matchId`     | `MatchService.currentMatchId` | Hidden, auto-filled                |
| `entityId`    | `SelectionService.selected`   | Dropdown of selected entities      |
| `side`        | `MatchService.currentSide`    | Hidden or read-only badge          |
| `batchId`     | Derived from `matchId`        | Hidden, auto-filled                |

### 9.3 The Tool Runner Extension
A dedicated extension that:
1. Lists all tools from `globalContractRegistry` in a searchable `QuickPickDialog`.
2. On selection, dynamically renders the `inputSchema` as a form inside a `Modal` or `Drawer`.
3. On submit, validates via `inputSchema.parse()`, calls `client.api[domain][action](data)`.
4. Displays the response by rendering the `outputSchema` result in a `PropertyGrid` or `CodeBlock`.

### 9.4 Benefits
- **Zero maintenance**: Adding a new tool contract automatically makes it available in the UI.
- **Type safety**: Zod validation runs before every call — impossible to send malformed data.
- **AI parity**: The exact same tool contract powers both the human debug UI and the AI agent tool calls.

---

## 10. Multiplexed Streaming

The simulation server emits a real-time event stream (SSE/HTTP streaming).
Multiple UI components need to watch this stream simultaneously.

### 10.1 The Problem
The SDK's `stream()` method creates a new HTTP connection per call.
If the Map, the Event Log, and the Status Bar all call `sim.get_stream()`, that's 3 connections to the same endpoint — wasting bandwidth and causing state drift.

### 10.2 The Solution: SimStreamService
A single service that maintains **one connection per match** and multicasts events internally.

```
Server ──(1 SSE connection)──► SimStreamService ──► Map (subscriber)
                                                ──► Event Log (subscriber)
                                                ──► Status Bar (subscriber)
                                                ──► Entity Cache (subscriber)
```

### 10.3 Subscriber API
```typescript
// Subscribe to all events for the active match
const unsub = simStream.subscribe((event: SimulationEvent) => {
    // Handle event
});

// Cleanup
context.subscriptions.push({ dispose: unsub });
```

### 10.4 Reference Counting
- **First subscriber**: Opens the SSE stream via `client.api.sim.get_stream({ matchId })`.
- **Additional subscribers**: Added to the internal callback list. No new connection.
- **Last subscriber unsubscribes**: The SSE stream is closed (reader cancelled).
- **Match changes**: Old stream is torn down, new stream is opened.

---

## 11. Theming System

### 11.1 CSS Custom Properties
All colors, spacing, and radii are defined as CSS custom properties on `:root`.
The `ThemeService` swaps property values when the theme changes.

### 11.2 Theme Tokens (`src/client/ui-lib/theme.ts`)
The `Theme` object provides TypeScript access to CSS variables with fallback defaults.
Components reference `Theme.colors.accent`, `Theme.spacing.md`, etc.

### 11.3 Tactical Theme Variants
- **Command (Default)**: Dark theme optimized for prolonged monitoring. Low contrast, easy on the eyes.
- **Alert**: High-contrast variant activated during critical simulation events. Brighter borders, pulsing status indicators.
- **Observer**: Neutral theme for spectator/replay mode. Desaturated force colors.

---

## 12. Migration Strategy (IDE → Command Center)

The current codebase inherits patterns from a generic code IDE. The following items must be
refactored to complete the transition.

### 12.1 Status Bar Cleanup
- **Remove**: Hardcoded `branch`, `encoding`, `language`, `position` items from `StatusBar.renderDefaultItems()`.
- **Replace**: `StatusBar` should initialize empty. All items are registered by extensions.

### 12.2 Extension Audit
- **Keep**: `MapExtension` — already domain-specific.
- **Refactor**: `ProjectScaffolderExtension` — convert to `MatchExtension` for match creation.
- **Create**: `EntityExtension`, `SimControlExtension`, `EventLogExtension`, `ToolRunnerExtension`.

### 12.3 Service Layer
- **Create**: `src/client/core/services/` directory.
- **Implement**: `MatchService`, `SimStreamService`, `SelectionService`.
- **Wire**: Initialize services in `IDE.ts` constructor, expose via `ide.matches`, `ide.stream`, `ide.selection`.

### 12.4 UI-Lib Gaps
Components that need to be created or enhanced for the tactical domain:

| Component           | Category | Purpose                                       |
| :------------------ | :------- | :--------------------------------------------- |
| `NumberInput`       | Forms    | Dedicated numeric input with step/min/max      |
| `Vector3Field`      | Forms    | Composite X/Y/Z input for coordinates          |
| `JsonTree`          | Data     | Collapsible JSON viewer for API responses       |
| `Timeline`          | Data     | Horizontal time scrubber for replay             |
| `MiniMap`           | Data     | Small overview map for spatial context          |
| `GaugeCluster`      | Data     | Circular gauges for speed/altitude/fuel         |
| `ForceColorBadge`   | Feedback | Side-aware colored indicator (Blue/Red/Neutral) |

---

## 13. Implementation Priority

### Phase 1: Foundation (P0)
1. Create `src/client/core/services/` with `MatchService` and `SelectionService`.
2. Wire `MatchService` into `IDE.ts`.
3. Clean up `StatusBar` — remove hardcoded IDE items.
4. Create `MatchExtension` — match list sidebar + status bar items.
5. Wire `MapExtension` to `MatchService` for match-aware rendering.

### Phase 2: Interactivity (P1)
6. Create `SimStreamService` with multiplexed streaming.
7. Create `EntityExtension` — entity inspector with subsystem tabs.
8. Create `SimControlExtension` — play/pause/step toolbar.
9. Create `EventLogExtension` — live event stream viewer.
10. Create `ToolRunnerExtension` — schema-driven debug console.

### Phase 3: Intelligence (P2)
11. Create `AgentExtension` — AI agent chat panel.
12. Create `DBBrowserExtension` — entity/weapon/scenario database browser.
13. Create `HistoryExtension` — post-match analytics and replay.
14. Implement tactical theme variants.

### Phase 4: Polish (P3)
15. Move legacy IDE features (Monaco, Terminal) into `DevToolsExtension`.
16. Implement missing `ui-lib` components (`Vector3Field`, `JsonTree`, `Timeline`).
17. Performance optimization — `VirtualList` everywhere, WebGL layer culling.
18. Accessibility audit — keyboard navigation, ARIA labels, screen reader support.

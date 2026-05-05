Starting fresh is a bold but necessary move. When a prototype accumulates too much technical debt—especially with faked data and tangled input handling—a clean break is the fastest path to a professional-grade product. 

Building a custom framework from scratch gives you absolute control over performance, which is exactly what you need for a 10Hz tactical simulator. Since End-to-End (E2E) testing is a primary directive, we have to design the DOM architecture to be inherently testable from day zero.

Here is a blueprint for architecting the new V2 UI folder from the ground up.

### Phase 1: Foundation & E2E Scaffolding
If E2E is a first-class citizen, the testing harness must dictate how the DOM is generated. We will design the custom framework around testability.

*   **The E2E Harness (Playwright):** Establish Playwright immediately. It handles WebSockets well and allows you to intercept network traffic.
*   **The Base Component:** Create an abstract `Component` class with strict lifecycles (`mount`, `render`, `update`, `unmount`). 
*   **Test Identifiers:** Bake a requirement into your `Component` base class that mandates `data-testid` attributes for all interactive elements. This ensures your E2E tests never rely on fragile CSS selectors or text content.
*   **Mocking the Gateway:** Build a lightweight mock utility for your E2E tests that injects static `ViewStateSnapshot` payloads, allowing you to test UI rendering without running the full engine backend.

### Phase 2: Strict State & The SDK Bridge
To eliminate "fake data," the UI must become a pure, dumb reflection of the `WarGamesClient` SDK.

*   **One-Way Data Flow:** Establish a strict pipeline. The SDK receives a binary frame, the `DeltaDecoder` translates it into a `ViewStateSnapshot`, and the UI simply consumes it. The UI must never mutate this state directly.
*   **Reactive Store:** Build a lightweight, strictly-typed observable store (using a simple Pub/Sub pattern). Components subscribe to specific slices of the state (e.g., the `FuelBingoDashboard` only listens to logistics and fuel updates).
*   **Zero-Tolerance Typing:** Enforce `strict: true` in your `tsconfig.json`. Bind your UI store directly to the SDK's schema definitions. If a property isn't in the schema, it doesn't get rendered.

### Phase 3: The Input & Command Architecture
To fix the "very bad" input handling, we need a standardized way to capture user intent and send it to the engine without fighting the 10Hz server ticks.

*   **Optimistic UI vs. Server Truth:** When a user drags a speed slider, the UI must display the *pending* value instantly and visually distinguish it (e.g., highlighting it orange). It should hold that value until the SDK fires a `COMMAND_ACK` event, at which point it snaps back to reading the server's truth.
*   **Command Dispatcher:** Centralize all user inputs through a UI dispatcher that maps directly to the SDK (e.g., `uiDispatch.fireWeapon(entityId, targetId)`). This makes E2E testing easy: your tests can intercept these dispatch calls to verify the UI is requesting the right actions.
*   **Debouncing & Throttling:** Build utility functions into your framework to debounce continuous inputs (like sliders or map panning) so you don't flood the `GatewayServer` with WebSocket messages.

### Phase 4: The Decoupled WebGL Renderer
PixiJS handles the tactical map, but it must be completely isolated from the DOM-based widgets.

*   **The Canvas Container:** The PixiJS application lives in its own standalone class. It takes a canvas element and listens to the same reactive store as the DOM widgets.
*   **Layer Abstraction:** Implement a strict layering system (Terrain -> Grids -> Tethers -> Entities -> UI Overlays).
*   **Culling Strategy:** Implement spatial hashing or bounding-box checks so PixiJS only renders the graphics objects currently visible within the user's viewport.

---

This plan gives you a high-performance, fully testable architecture that respects the power of your backend engine. 

# War Games Engine V3 Client SDK Specification

## 1. Executive Summary
The goal of this SDK is to abstract the WebSocket communication, binary delta-decoding, and payload formatting currently handled by the static `CommandBus.ts`. By migrating to an instance-based, modular SDK, the platform will support multiple concurrent connections, headless automated testing (bots/AI), and a cleaner, promise-driven developer experience for the frontend UI.

## 2. Core Architectural Principles
*   **Instance-Based:** Replace the static singleton model with an instantiable Client class. This allows a single application to connect to multiple server instances or matches simultaneously.
*   **Promise-Driven Acknowledgments:** Transition from a purely "fire-and-forget" broadcast model to a Request-Response model where commands return Promises that resolve upon receiving a `COMMAND_ACK` from the server.
*   **Transparent Serialization:** The SDK will internally handle the decoding of binary `ViewStateSnapshots` via the `DeltaDecoder`, exposing only clean, strongly-typed JavaScript objects to the consumer.
*   **Event-Driven Subscriptions:** Utilize a robust Event Emitter pattern scoped to specific domains (e.g., listening only to `CombatEvents` rather than a global firehose of messages).
*   **Transport Agnostic (Future-Proofing):** While initially wrapping WebSockets, the internal architecture should allow swapping the transport layer (e.g., WebRTC, direct memory transport for single-process electron apps) without changing the public API.

## 3. Modular Breakdown
The SDK will be divided into specific capability modules accessible via a central Client instance.

### 3.1. Core Client Module (Connection Management)
Responsible for lifecycle, network transport, and raw message routing.
*   **Capabilities:**
    *   Initialize connection with URL, authentication tokens (if applicable), and configuration options (e.g., max retries, timeout limits).
    *   Handle automatic reconnections with exponential backoff.
    *   Provide connection state observables (Connecting, Connected, Disconnected, Reconnecting, Error).
    *   Offline message queuing: Buffer critical commands issued during a brief network drop and flush them upon reconnection.
    *   Graceful disconnection and cleanup of event listeners.

### 3.2. Session & Match Module
Responsible for establishing the player's presence in a specific simulation.
*   **Capabilities:**
    *   Join a specific match by ID and Side (Blue, Red, Neutral).
    *   Leave a match.
    *   Query active match details, current participant counts, and server health.

### 3.3. Tactical Commander Module
Replaces the raw `dispatch` method with highly specific, domain-mapped command triggers.
*   **Capabilities:**
    *   **Navigation:** Issue commands for Waypoints, Speed, Altitude, and Course.
    *   **Combat:** Issue commands for Weapon Assignment, Firing, and Mount Slewing.
    *   **Sensors & EW:** Control EMCON states, active/passive sensor toggles, and Jammer configurations.
    *   **Logistics:** Trigger Resource transfers, Base landings, and Loadout changes.
    *   **Doctrine:** Update Rules of Engagement (ROE) and Weapon Release Authorization (WRA) rules.
*   **Behavior:** Every command method validates parameters locally before network transmission and returns a Promise that resolves when the server confirms receipt and structural validity.

### 3.4. State & Telemetry Subscription Module
Responsible for managing the flow of data *from* the server to the client.
*   **Capabilities:**
    *   Subscribe to the global `ViewState` stream (firing at the server's tick rate).
    *   Subscribe to localized tactical events (e.g., `WeaponFired`, `EntityDestroyed`, `SubsystemDamaged`).
    *   Request and subscribe to historical Telemetry data for graphing and after-action reviews.
    *   Automatically intercept binary blobs, route them through the internal `DeltaDecoder`, and emit the resulting JSON objects to subscribers.

### 3.5. System & Scenario Module
Responsible for global simulation controls and database interactions.
*   **Capabilities:**
    *   Control time compression (Pause, 1x, 5x, 15x).
    *   Fetch profile databases (DB3000) for Units, Weapons, and Loadouts.
    *   Trigger Scenario Exports (downloading the world state).
    *   Push Scenario Imports (uploading a world state to overwrite the server).

## 4. Error Handling & Resilience
*   **Strongly Typed Errors:** The SDK will throw specific error types (e.g., `NetworkError`, `CommandValidationError`, `SideIsolationError`) rather than generic strings.
*   **Dead-Letter Queue:** If a command is rejected by the server (e.g., trying to command an enemy unit), the SDK will capture the `COMMAND_ACK` failure and reject the associated Promise, allowing the UI to show an immediate toast notification.


### The 3 Levels of Testing (Corrected)

**1. Unit Testing (Your "Code Testing")**
*   **What it is:** Testing the smallest piece of testable code (usually a single function, method, or class) in total isolation. 
*   **In your project:** This means testing your engine systems purely in memory. For example, testing the `PhysicsSystem` to ensure an entity accelerates correctly based on thrust and mass, entirely without a server or a UI.

**2. Integration Testing (Your "Server Code")**
*   **What it is:** Testing how two or more isolated units work together. You were right that this involves the server, but it's important to label it as an *integration* test rather than a unit test.
*   **In your project:** This is where you test the "glue." For example, booting up a test instance of your `GatewayServer` on a test port, connecting a WebSocket client, and verifying that a `JOIN_MATCH` command is successfully processed[cite: 4]. 

**3. End-to-End (E2E) / UI Testing (Your "Browser Test")**
*   **What it is:** Testing the entire application stack from the user's perspective, treating the underlying code as a black box.
*   **In your project:** This involves using a tool like Playwright to launch a real browser, click the "ENTER TACTICAL" button, and verify that the tactical map and order of battle (OOB) rows actually render on the screen[cite: 4].

---

### A Rule Set for Testing Your Platform

When building a high-fidelity simulation and UI, follow these rules to keep your test suite fast, reliable, and useful.

*   **Rule 1: Keep Unit Tests Strictly Isolated**
    *   Unit tests must run entirely in memory and execute in milliseconds. 
    *   Do not instantiate the `GatewayServer` or the PixiJS `Application` in these tests.
    *   *Example:* When testing the `TMSSystem`, instantiate a raw `World`, add an entity with a `DetectionComponent`, tick the world, and assert that a new track was created[cite: 4].

*   **Rule 2: Mock the Network for Frontend Logic**
    *   When testing your frontend `UIStore` or PixiJS components, do not rely on a live WebSocket connection.
    *   *Example:* Intercept the `CommandBus` messages in your tests to simulate receiving a `VIEW_STATE` payload, then assert that the UI updates accordingly.

*   **Rule 3: Integration Tests Should Use Test Environments**
    *   When testing server communication, never connect to your live production server.
    *   *Example:* Your integration tests should programmatically spin up the `GatewayServer` on a dedicated test port (e.g., 3001), run the WebSocket connections, and tear the server down after the test finishes[cite: 4].

*   **Rule 4: Write E2E Tests Sparingly**
    *   Browser tests are slow and prone to breaking when you tweak UI layouts. Use them only for critical "happy paths" (the core user journeys).
    *   *Example:* Write an E2E test to ensure a user can select a unit, click the map to issue a `SetCourse` command, and see the command acknowledged by the server. Rely on unit tests for the complex math behind *how* that course is calculated.

*   **Rule 5: Test Behaviors, Not Just Data**
    *   Don't just test that a variable changed from `A` to `B`. Test the consequence of that change.
    *   *Example:* If testing the `DamageDegradationSystem`, don't just assert that health went down. Assert that if the engine subsystem's health drops to 0, the `KinematicsComponent` thrust is forced to 0 on the next tick.

# Stabilizing Tactical Engine Tests & SSE Integration

This plan addresses several critical issues identified in the current test suite:
1.  **SSE Protocol Mismatch**: The SDK client expects plain JSON-per-line, but the server emits standard SSE `data: <json>\n\n`.
2.  **Broken Automation Mocks**: Unit tests for automation tools provide incomplete mocks for `ScenarioAutomationSystem`, missing new public methods.
3.  **Unreliable Integration Tests**: Timing issues and hook timeouts in `sse_integration.test.ts`.

## Proposed Changes

### [Component] SDK Client (V2)

#### [MODIFY] [WarGamesClientV2.ts](file:///home/ubuntu/code/war-games/src/sdk_v2/generated/WarGamesClientV2.ts)
- Update the `stream` method to handle `data: ` prefixes in the response buffer.
- Robustly handle `\n\n` delimiters used by the server's SSE implementation.

### [Component] Automation Tools Tests

#### [MODIFY] [automation.test.ts](file:///home/ubuntu/code/war-games/src/tests/server_v2/tools/automation/automation.test.ts)
- Update mocks to include `getPendingEvents()`, `getTriggeredEvents()`, and `triggerEvent()`.
- Ensure tests align with the refactored `automation_list_events` and `automation_trigger_event` tools.

### [Component] SSE Integration Tests

#### [MODIFY] [sse_integration.test.ts](file:///home/ubuntu/code/war-games/src/tests/server_v2/sse_integration.test.ts)
- Increase `beforeAll` timeout to avoid flakey 10s default failures.
- Add error logging in the `consumePromise` to avoid silent failures during stream parsing.
- Refine event waiting logic to ensure the stream is established before triggering events.

## Verification Plan

### Automated Tests
- Run `npm run test` to verify all suites pass.
- Specifically run `npx vitest src/tests/server_v2/sse_integration.test.ts` to verify the fix.
- Specifically run `npx vitest src/tests/server_v2/tools/automation/automation.test.ts` to verify the fix.

### Manual Verification
- Verify that the CLI/UI can still consume streams if they were working before.

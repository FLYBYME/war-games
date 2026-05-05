# Engine Hardening: Architectural Remediation Strategy

## 1. Executive Summary
The current simulation engine is a high-performance "Bare-Metal" ECS architecture using SharedArrayBuffers. While efficient, the lack of strict data ownership and phase-ordering guarantees has introduced fragility. Small logic changes in one tactical system (e.g., Guidance) are frequently undone or corrupted by concurrent systems (e.g., Combat or TMS) within the same simulation tick.

## 2. Identified Anti-Patterns

### A. Mutual Buffer Mutation (The "Race to the Bottom")
**Issue:** Multiple systems read and write to the same buffer keys (e.g., `bbTargetIds`) simultaneously.
**Consequence:** A weapon might acquire a target in the Guidance Phase, only for the Combat Phase to clear that target ID because a sensor track "flickered" for one micro-tick.

### B. Ordering Sensitivity
**Issue:** Regression tests often run for only 1 or 2 ticks. If System A (Perception) runs after System B (Decision), the Decision system is always acting on stale data from the *previous* tick.
**Consequence:** Inconsistent test results and "ghost" behaviors where weapons ignore direct parent commands.

### C. The "Opaque" Pipeline
**Issue:** We rely on `expect(val).toBe(x)` in tests, but we have no visibility into *why* a value changed.
**Consequence:** Debugging requires manual `console.error` tracing throughout the ECS loop.

## 3. Hardening Roadmap

### Phase 1: The Intent Buffer (Double Buffering)
- **Goal:** Separate "Current State" (Read-Only) from "Next Intent" (Write-Only).
- **Implementation:** Introduce an `IntentBuffer` where systems record requested changes (e.g., `requestHeadingChange`).
- **Benefit:** No system can overwrite another system's logic until the final **Reconciliation Phase** at the end of the tick.

### Phase 2: Strict Ownership Enforcer
- **Goal:** Define which system "owns" which buffer.
- **Rules:**
  - `CombatSystem` owns `bbTargetIds`.
  - `GuidanceSystem` owns `targetHeadings` and `targetAltitudes`.
  - `SensorSystem` owns the `DetectionBitset`.
- **Enforcement:** Introduce a lint-level or runtime check that prevents unauthorized systems from writing to keys they don't own.

### Phase 3: Formal Tactical State Machines
- **Goal:** Replace complex nested `if/else` logic with explicit states.
- **Weapon States:** `SLAVED`, `ACQUIRING`, `LOCKED`, `SPOOFED`, `RE_ACQUISITION`.
- **Logic:** Systems transition the entity between states. The state itself dictates which logic branch to run, preventing "logic bleeding."

### Phase 4: SimTracer Implementation
- **Goal:** Automated audit logs for every entity.
- **Implementation:** A `TracerSystem` that captures state transitions:
  - `[Tick 12] ID:45 (Missile) -> Transition: ACQUIRING to LOCKED (Target: ID:12)`
  - `[Tick 13] ID:45 (Missile) -> Reason: Target ID:12 hidden by Horizon`

## 4. Verification Standard
A task is not complete until:
1. The logic is implemented in the corresponding System.
2. An **Event Trace** is added to verify the logic path in tests.
3. The regression test passes for at least 100 continuous ticks to prove stability over time.

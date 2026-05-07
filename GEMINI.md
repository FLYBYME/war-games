# Gemini TypeScript Engineering Standards

This document defines the strict TypeScript coding standards for this repository. When generating, refactoring, or reviewing code, these rules are absolute. The goal is a high-integrity, type-safe system where the compiler and linter guarantee runtime stability.

## 1. The Absolute Ban on `any`
TypeScript exists to provide compile-time safety. Using `any` disables the compiler and introduces runtime fragility.

* **Rule:** NEVER use `any`. 
* **Rule:** NEVER cast to `any` (e.g., `(unit as any)`).
* **Alternative:** If a payload's shape is truly unknown (e.g., a raw WebSocket message), type it as `unknown`. You must then narrow the type using type guards or a schema validator (like Zod) before accessing its properties.

**Bad:**
```typescript
function processPayload(data: any) {
    const name = data.profile.name; // Fragile
}
```

**Good:**
```typescript
function processPayload(data: unknown) {
    const validatedData = ProtocolSchema.parse(data);
    const name = validatedData.profile.name; // Safe
}
```

## 2. Schema-Driven Types (Zod)
Do not duplicate types. The system relies heavily on Zod for boundary validation (APIs, WebSockets, Storage).

* **Rule:** Define the Zod schema first.
* **Rule:** Always infer the TypeScript interface directly from the Zod schema using `z.infer`.
* **Rule:** UI components, workers, and internal functions must use these inferred types for their parameters/props.

**Bad:**
```typescript
const UserSchema = z.object({ id: z.string() });
interface User { id: string; } // Duplication
```

**Good:**
```typescript
export const UserSchema = z.object({ id: z.string() });
export type User = z.infer<typeof UserSchema>;
```

## 3. Type Assertions (`as Type`) are a Code Smell
Casting using the `as` keyword tells the compiler to ignore its own inference. This masks structural errors.

* **Rule:** Avoid `as Type` unless interacting with external boundaries where type definition is impossible (e.g., specific DOM elements like `e.target as HTMLInputElement`).
* **Alternative:** Use structural checking, discriminated unions, or type predicate functions (`arg is Type`).

**Bad:**
```typescript
const track = entity as Track;
```

**Good:**
```typescript
if (isTrack(entity)) {
    // entity is safely narrowed to Track
}
```

## 4. Strict Scoping and Control Flow
Linter rules exist to prevent logic leaks and dead code. They are not suggestions.

* **Rule: Block-Scoped Switch Cases:** If you declare a variable (`const`, `let`) inside a `case` statement, you MUST wrap the case logic in curly braces `{}` to prevent lexical scope bleed.
* **Rule: No Unused Variables:** Do not leave dead variables, unused parameters, or hanging imports in the code. If an interface/function signature requires a parameter that is not used in the implementation, prefix it with an underscore (e.g., `_dt: number`).

**Bad:**
```typescript
switch (action) {
    case 'MOVE':
        const speed = payload.speed; // Scope bleed
        break;
}
```

**Good:**
```typescript
switch (action) {
    case 'MOVE': {
        const speed = payload.speed; // Safely scoped
        break;
    }
}
```

## 5. Architectural Boundaries
Data passing from the Engine/Server to the UI must maintain its type integrity across the gap.

* **Rule:** Do not pass raw generic blobs into presentation components.
* **Rule:** Destructure and pass explicitly typed primitives or inferred Zod objects to UI components. If a map layer needs a unit's WEZ (Weapon Engagement Zone), pass the `wez` array specifically, not the entire untyped unit object.

## 6. Universal Command Pattern (CQRS)
To prevent interface fragmentation and ensure total parity between the UI, Server, and AI Agents, all state-mutating actions MUST utilize the Universal Command Pattern. 

* **Rule: Single Source of Truth:** All commands must be defined as strict Zod objects and exported within the master `EngineCommandSchema` `z.discriminatedUnion`.
* **Rule: Strict Payloads (No Unknowns):** Never use `z.record(z.unknown())`, `z.any()`, or loose generic types to bypass strict typing on complex commands. If a command like `SetMission` has wildly different parameters based on the mission type, you MUST use a nested discriminated union. 
* **Rule: Universal Dispatch:** The SDK, UI, CLI, and test suites must never use specialized wrapper functions (e.g., `setCourse(x,y)`). They must construct the raw command object and pass it to the singular `executeCommand(payload)` method.
* **Rule: Self-Documenting LLM Schemas:** Every field in a command schema MUST include a `.describe("...")` annotation. AI Tools are generated directly and automatically from these Zod schemas; if you omit descriptions, the AI will not know how to command the engine.

**Bad (Fragmented & Lazy):**
```typescript
// Hand-written wrapper
function assignMission(id: string, missionType: string, params: any) { ... }

// Lazy Schema
const SetMissionSchema = z.object({
    type: z.literal('SetMission'),
    entityId: z.string(),
    missionType: z.string(),
    params: z.record(z.unknown()) // ILLEGAL: Allows AI hallucinations
});
```

**Good (Strict & Universal):**
```typescript
// Strict Nested Union
const InterceptMissionSchema = z.object({
    missionType: z.literal('Intercept').describe("Assign intercept mission"),
    targetId: z.string().describe("Hostile track ID to intercept"),
    speedKts: z.number().describe("Intercept velocity")
});

const SetMissionSchema = z.object({
    type: z.literal('SetMission').describe("Assigns a new mission to a unit"),
    entityId: z.string().describe("ID of the executing unit"),
    mission: z.discriminatedUnion('missionType', [InterceptMissionSchema, PatrolMissionSchema])
});

// Universal Execution
sdkClient.dispatch({
    type: 'SetHeading',
    entityId: intent.entityId,
    heading: p.heading
});
```
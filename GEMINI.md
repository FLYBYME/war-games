# Gemini TypeScript Engineering Standards

This document defines the strict TypeScript coding standards for this repository. When generating, refactoring, or reviewing code, these rules are absolute. The goal is a high-integrity, type-safe system where the compiler and linter guarantee runtime stability.

Always use `/home/ubuntu/code/war-games/docs/plans` to create a plan before generating code.

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

## 3. Type Assertions and Non-Nulls are a Code Smell
Casting using the `as` keyword or the non-null assertion `!` tells the compiler to ignore its own inference. This masks structural errors and causes runtime crashes.

* **Rule: No `as Type` Casting:** Avoid `as Type` unless interacting with external boundaries where type definition is impossible (e.g., specific DOM elements like `e.target as HTMLInputElement`).
* **Rule: No Non-Null Assertions (`!`):** NEVER use the `!` operator to override nullability checks. If a value might be null/undefined, handle it with an explicit `if` check, a default value, or throw a descriptive error.
* **Alternative:** Use structural checking, discriminated unions, or type predicate functions (`arg is Type`).

**Bad:**
```typescript
const track = entity as Track; // Unsafe casting
const name = unit.profile!.name; // Potential runtime crash
```

**Good:**
```typescript
if (isTrack(entity)) {
    // entity is safely narrowed to Track
}

const profile = unit.profile;
if (!profile) throw new Error(`Unit ${unit.id} has no profile`);
const name = profile.name; // Safely accessed
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

## 5. Architectural Boundaries (V2)
Data passing from the Engine/Server to the UI must maintain its type integrity across the gap. The V2 architecture enforces this via a **Generated SDK** and **Auto-Routing**.

* **Rule:** Do not pass raw generic blobs into presentation components.
* **Rule:** Destructure and pass explicitly typed primitives or inferred Zod objects to UI components. If a map layer needs a unit's WEZ (Weapon Engagement Zone), pass the `wez` array specifically, not the entire untyped unit object.
* **Rule:** UI and External Scripts must use the generated `WarGamesClientV2` to ensure 100% type-safe API interactions.

## 6. Unified Tool Contract (V2)
To ensure total parity between the UI, Server, and AI Agents, every action and query in the system MUST be defined as a `WarGamesTool` using a **Unified Tool Contract**.

* **Rule: Source of Truth (Contract):** Every capability must be defined in `src/sdk_v2/contracts` using `defineContract`. This includes Zod schemas for input/output and REST metadata.
* **Rule: Implementation Split:** The server-side logic MUST live in `src/server_v2/tools` and be defined using `defineTool`. Implementation code (like ECS engine logic) must never be imported into the Contract files.
* **Rule: Strict Payloads (No Unknowns):** Never use `z.record(z.unknown())`, `z.any()`, or loose generic types. Use discriminated unions for complex, polymorphic payloads.
* **Rule: Self-Documenting Annotations:** Every field in an `inputSchema` MUST include a `.describe("...")` annotation. This is mandatory for auto-generating AI tool definitions and SDK documentation.

**Bad (Leaky & Untyped):**
```typescript
// Server logic leaked into shared file
export const MyTool = {
    call: async (data: any) => { /* engine logic here */ } 
};
```

**Good (Strict & Split):**
```typescript
// 1. Shared Contract (src/sdk_v2/contracts/entity/entity_move.ts)
export const entityMoveContract = defineContract({
    domain: 'entity',
    action: 'move',
    description: 'Command an entity to move to a 3D coordinate.',
    inputSchema: z.object({
        matchId: z.string().describe("Target match ID"),
        entityId: z.string().describe("Target entity ID"),
        position: Vector3Schema.describe("Target destination")
    }),
    outputSchema: z.object({ success: z.boolean() }),
    rest: { method: 'POST', path: '/matches/:matchId/entities/:entityId/move' }
});

// 2. Server Implementation (src/server_v2/tools/entity/entity_move.ts)
export const entity_move = defineTool(entityMoveContract, async (input, ctx) => {
    const world = ctx.app.matchService.getMatch(input.matchId);
    // ... execution logic ...
    return { success: true };
});
```
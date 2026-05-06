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
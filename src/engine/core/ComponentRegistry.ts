import { IComponent } from './Types.js';

/**
 * ComponentConstructorFn: Minimal interface for component constructors.
 * Components have varied constructor signatures (Partial<T>, arrays, etc.),
 * so we use a broad overload that accepts the serialized data record.
 */
interface ComponentConstructorFn {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for generic component factory pattern
    new (...args: never[]): IComponent;
    readonly name: string;
}

/**
 * ComponentRegistry: Maps component type names to their constructors.
 * Required for deserialization of saved simulation states.
 */
export class ComponentRegistry {
    private static constructors = new Map<string, ComponentConstructorFn>();

    public static register(constructor: ComponentConstructorFn) {
        // Use the class name as the registry key
        this.constructors.set(constructor.name, constructor);
    }

    public static get(name: string): ComponentConstructorFn | undefined {
        return this.constructors.get(name);
    }

    public static create(name: string, data: Record<string, string | number | boolean | null | object>): IComponent | undefined {
        const ctor = this.get(name);
        if (!ctor) return undefined;

        // V3 Professional Hydration: Prefer constructor for logic preservation
        try {
            // Most V3 components accept a Partial<T> in constructor
            // We use Reflect.construct to bypass the strict `never[]` type constraint
            return Reflect.construct(ctor, [data]) as IComponent;
        } catch (err: unknown) {
            // Fallback to prototype-based creation for legacy or simple components
            const instance = Object.create(ctor.prototype) as IComponent;
            if (data && typeof data === 'object') {
                Object.assign(instance, data);
            }
            return instance;
        }
    }
}

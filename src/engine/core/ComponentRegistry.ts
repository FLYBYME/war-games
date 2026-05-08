import { IComponent, ComponentConstructor } from './Types.js';

/**
 * ComponentRegistry: Maps component type names to their constructors.
 * Required for deserialization of saved simulation states.
 */
export class ComponentRegistry {
    private static constructors = new Map<string, ComponentConstructor<IComponent>>();

    public static register(constructor: ComponentConstructor<IComponent>) {
        // Use the class name as the registry key
        this.constructors.set(constructor.name, constructor);
    }

    public static get(name: string): ComponentConstructor<IComponent> | undefined {
        return this.constructors.get(name);
    }

    public static create(name: string, data: unknown): IComponent | undefined {
        const ctor = this.get(name);
        if (!ctor) return undefined;

        // V3 Professional Hydration: Prefer constructor for logic preservation
        try {
            // Most V3 components accept a Partial<T> in constructor
            return new ctor(data);
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

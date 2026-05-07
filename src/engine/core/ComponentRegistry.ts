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

        // Create instance and hydrate with data
        const instance = Object.create(ctor.prototype) as IComponent;
        Object.assign(instance, data as object);
        return instance;
    }
}

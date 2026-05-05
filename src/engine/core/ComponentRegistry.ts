import { IComponent, ComponentConstructor } from './Types.js';

/**
 * ComponentRegistry: Maps component type names to their constructors.
 * Required for deserialization of saved simulation states.
 */
export class ComponentRegistry {
    private static constructors = new Map<string, ComponentConstructor<any>>();

    public static register(constructor: ComponentConstructor<any>) {
        // Use the class name as the registry key
        this.constructors.set(constructor.name, constructor);
    }

    public static get(name: string): ComponentConstructor<any> | undefined {
        return this.constructors.get(name);
    }

    public static create(name: string, data: any): IComponent | undefined {
        const ctor = this.get(name);
        if (!ctor) return undefined;

        // Create instance and hydrate with data
        const instance = Object.create(ctor.prototype);
        Object.assign(instance, data);
        return instance;
    }
}

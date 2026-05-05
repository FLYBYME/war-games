import { EntityId, IComponent, ComponentConstructor, Side } from './Types.js';

/**
 * Entity: A container for data components.
 * V3 Refinement: Supports multiple components of the same type (e.g. multiple sensors).
 */
export class Entity {
    private readonly components = new Map<string, IComponent[]>();

    constructor(
        public readonly id: EntityId,
        public side: Side = Side.Neutral,
        public parentEntityId?: EntityId,
        public profileId?: string
    ) {}

    public addComponent(component: IComponent): void {
        const list = this.components.get(component.type) || [];
        list.push(component);
        this.components.set(component.type, list);
    }

    public getComponent<T extends IComponent>(constructor: ComponentConstructor<T>): T | undefined {
        const list = this.components.get(constructor.name);
        return list && list.length > 0 ? (list[0] as T) : undefined;
    }

    public getComponents<T extends IComponent>(constructor: ComponentConstructor<T>): T[] {
        return (this.components.get(constructor.name) || []) as T[];
    }

    public hasComponent<T extends IComponent>(constructor: ComponentConstructor<T>): boolean {
        return this.components.has(constructor.name);
    }

    public removeComponent<T extends IComponent>(constructor: ComponentConstructor<T>): void {
        this.components.delete(constructor.name);
    }

    public getAllComponents(): IComponent[] {
        const all: IComponent[] = [];
        for (const list of this.components.values()) {
            all.push(...list);
        }
        return all;
    }
}

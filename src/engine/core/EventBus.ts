import { SimulationEvent } from './Types.js';

export type EventHandler<T extends SimulationEvent> = (event: T) => void;

/**
 * EventBus: Type-safe message passing for Engine V3.
 * 
 * The internal handler map stores functions typed as `(event: SimulationEvent) => void`.
 * Narrowed handlers are wrapped at registration time so no `as unknown` casts are needed.
 * A secondary Map tracks the wrapped versions for deregistration.
 */
export class EventBus {
    private readonly handlers = new Map<string, Set<(event: SimulationEvent) => void>>();
    private readonly anyHandlers = new Set<(event: SimulationEvent) => void>();
    // Map original handler function → wrapped handler for removal support
    private readonly wrapperMap = new Map<Function, (event: SimulationEvent) => void>();

    public on<T extends SimulationEvent>(type: T['type'], handler: EventHandler<T>): void {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        // Create a base-typed wrapper that narrows at call time
        const wrapper = (event: SimulationEvent): void => {
            handler(event as T);
        };
        this.handlers.get(type)?.add(wrapper);
        this.wrapperMap.set(handler, wrapper);
    }

    public off<T extends SimulationEvent>(type: T['type'], handler: EventHandler<T>): void {
        const wrapper = this.wrapperMap.get(handler);
        if (wrapper) {
            this.handlers.get(type)?.delete(wrapper);
            this.wrapperMap.delete(handler);
        }
    }

    public onAny(handler: (event: SimulationEvent) => void): void {
        this.anyHandlers.add(handler);
    }

    public offAny(handler: (event: SimulationEvent) => void): void {
        this.anyHandlers.delete(handler);
    }

    public emit(event: SimulationEvent): void {
        const handlers = this.handlers.get(event.type);

        handlers?.forEach(handler => handler(event));
        this.anyHandlers.forEach(handler => handler(event));
    }
}

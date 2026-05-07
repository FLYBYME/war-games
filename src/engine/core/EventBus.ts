import { SimulationEvent } from '../../sdk/schemas/index.js';

export type EventHandler<T extends SimulationEvent> = (event: T) => void;

/**
 * EventBus: Type-safe message passing for Engine V3.
 */
export class EventBus {
    private readonly handlers = new Map<string, Set<EventHandler<SimulationEvent>>>();
    private readonly anyHandlers = new Set<(event: SimulationEvent) => void>();

    public on<T extends SimulationEvent>(type: T['type'], handler: EventHandler<T>): void {
        //console.log(`[EventBus] Registering handler for: ${type}`);
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type)?.add(handler as unknown as EventHandler<SimulationEvent>);
    }

    public off<T extends SimulationEvent>(type: T['type'], handler: EventHandler<T>): void {
        this.handlers.get(type)?.delete(handler as unknown as EventHandler<SimulationEvent>);
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

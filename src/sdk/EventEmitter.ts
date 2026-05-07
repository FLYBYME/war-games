/**
 * SDK Event Emitter.
 * Type-safe, domain-scoped event system with wildcard support.
 */

export type EventHandler<T = unknown> = (payload: T) => void;

export class EventEmitter {
    private handlers = new Map<string, Set<EventHandler<unknown>>>();
    private anyHandlers = new Set<EventHandler<{ type: string; payload: unknown }>>();

    /** Subscribe to a specific event type, supports wildcards like 'state:*' or '*' */
    on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
        if (event === '*') {
            return this.onAny((evt) => handler(evt.payload as T));
        }

        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        
        // Safety: We use unknown internally to store diverse handlers
        const internalHandler = handler as unknown as EventHandler<unknown>;
        this.handlers.get(event)?.add(internalHandler);
        return () => this.off(event, internalHandler);
    }

    /** Subscribe once — auto-unsubscribes after first fire */
    once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
        const wrapper: EventHandler<T> = (payload) => {
            unsub();
            handler(payload);
        };
        const unsub = this.on(event, wrapper);
        return unsub;
    }

    /** Unsubscribe from a specific event */
    off(event: string, handler: EventHandler<unknown>): void {
        this.handlers.get(event)?.delete(handler);
    }

    /** Subscribe to ALL events (useful for logging / debugging) */
    onAny(handler: EventHandler<{ type: string; payload: unknown }>): () => void {
        this.anyHandlers.add(handler);
        return () => this.anyHandlers.delete(handler);
    }

    /** Unsubscribe from all events */
    offAny(handler: EventHandler<{ type: string; payload: unknown }>): void {
        this.anyHandlers.delete(handler);
    }

    /** Emit an event to all subscribers */
    emit(event: string, payload?: unknown): void {
        // 1. Exact Match
        this.handlers.get(event)?.forEach(h => this.safeInvoke(h, payload));

        // 2. Wildcard Matches (e.g. 'state:*' matches 'state:viewState')
        for (const [pattern, set] of this.handlers) {
            if (pattern.endsWith(':*')) {
                const prefix = pattern.split(':*')[0];
                if (event.startsWith(prefix + ':')) {
                    set.forEach(h => this.safeInvoke(h, payload));
                }
            } else if (pattern.includes('*') && pattern !== '*') {
                // Generic wildcard (slower path)
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                if (regex.test(event)) {
                    set.forEach(h => this.safeInvoke(h, payload));
                }
            }
        }

        // 3. Global Wildcards
        this.anyHandlers.forEach(h => this.safeInvoke(h, { type: event, payload }));
    }

    private safeInvoke(handler: EventHandler<unknown>, payload: unknown): void {
        try {
            handler(payload);
        } catch (err: unknown) {
            const error = err as Error;
            console.error('EventEmitter handler error:', error.message);
        }
    }

    /** Remove all subscriptions */
    removeAllListeners(): void {
        this.handlers.clear();
        this.anyHandlers.clear();
    }
}

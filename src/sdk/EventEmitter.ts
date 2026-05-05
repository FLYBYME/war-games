/**
 * SDK Event Emitter.
 * Type-safe, domain-scoped event system with wildcard support.
 */

export type EventHandler<T = any> = (payload: T) => void;

export class EventEmitter {
    private handlers = new Map<string, Set<EventHandler>>();
    private anyHandlers = new Set<EventHandler<{ type: string; payload: any }>>();

    /** Subscribe to a specific event type, supports wildcards like 'state:*' or '*' */
    on<T = any>(event: string, handler: EventHandler<T>): () => void {
        if (event === '*') {
            return this.onAny((evt) => handler(evt.payload as T));
        }

        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)!.add(handler);
        return () => this.off(event, handler);
    }

    /** Subscribe once — auto-unsubscribes after first fire */
    once<T = any>(event: string, handler: EventHandler<T>): () => void {
        const wrapper: EventHandler<T> = (payload) => {
            unsub();
            handler(payload);
        };
        const unsub = this.on(event, wrapper);
        return unsub;
    }

    /** Unsubscribe from a specific event */
    off(event: string, handler: EventHandler): void {
        this.handlers.get(event)?.delete(handler);
    }

    /** Subscribe to ALL events (useful for logging / debugging) */
    onAny(handler: EventHandler<{ type: string; payload: any }>): () => void {
        this.anyHandlers.add(handler);
        return () => this.anyHandlers.delete(handler);
    }

    /** Unsubscribe from all events */
    offAny(handler: EventHandler<{ type: string; payload: any }>): void {
        this.anyHandlers.delete(handler);
    }

    /** Emit an event to all subscribers */
    emit(event: string, payload?: any): void {
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

    private safeInvoke(handler: EventHandler, payload: any): void {
        try {
            handler(payload);
        } catch (err) {
            console.error('EventEmitter handler error:', err);
        }
    }

    /** Remove all subscriptions */
    removeAllListeners(): void {
        this.handlers.clear();
        this.anyHandlers.clear();
    }
}

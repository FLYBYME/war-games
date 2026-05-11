/**
 * EventBus - Central Pub/Sub system for inter-component communication
 * The "nervous system" of the IDE
 */

export type EventCallback<T = any> = (data: T) => void;

interface Subscription {
    id: number;
    callback: EventCallback;
    once: boolean;
}

export class EventBus {
    private events: Map<string, Subscription[]> = new Map();
    private subscriptionId: number = 0;

    constructor() { }

    /**
     * Subscribe to an event
     * @param event - Event name (e.g., "file.opened", "editor.save")
     * @param callback - Function to call when event is emitted
     * @returns Subscription ID for unsubscribing
     */
    public on<T = any>(event: string, callback: EventCallback<T>): number {
        const id = ++this.subscriptionId;
        const subscriptions = this.events.get(event) || [];
        subscriptions.push({ id, callback, once: false });
        this.events.set(event, subscriptions);
        return id;
    }

    /**
     * Subscribe to an event once (auto-unsubscribes after first trigger)
     */
    public once<T = any>(event: string, callback: EventCallback<T>): number {
        const id = ++this.subscriptionId;
        const subscriptions = this.events.get(event) || [];
        subscriptions.push({ id, callback, once: true });
        this.events.set(event, subscriptions);
        return id;
    }

    /**
     * Emit an event with data
     */
    public emit<T = any>(event: string, data?: T): void {
        const subscriptions = this.events.get(event);
        if (!subscriptions) return;

        const toRemove: number[] = [];

        for (const sub of subscriptions) {
            try {
                sub.callback(data);
                if (sub.once) {
                    toRemove.push(sub.id);
                }
            } catch (error) {
                console.error(`EventBus: Error in handler for "${event}"`, error);
            }
        }

        // Remove one-time subscriptions
        if (toRemove.length > 0) {
            this.events.set(
                event,
                subscriptions.filter((s) => !toRemove.includes(s.id))
            );
        }
    }

    /**
     * Unsubscribe from an event by subscription ID
     */
    public off(subscriptionId: number): boolean {
        for (const [event, subscriptions] of this.events) {
            const index = subscriptions.findIndex((s) => s.id === subscriptionId);
            if (index !== -1) {
                subscriptions.splice(index, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Remove all subscriptions for an event
     */
    public offAll(event: string): void {
        this.events.delete(event);
    }

    /**
     * Clear all subscriptions (useful for testing/cleanup)
     */
    public clear(): void {
        this.events.clear();
        this.subscriptionId = 0;
    }

    /**
     * Get subscription count for debugging
     */
    public getSubscriptionCount(event?: string): number {
        if (event) {
            return this.events.get(event)?.length || 0;
        }
        let count = 0;
        for (const subs of this.events.values()) {
            count += subs.length;
        }
        return count;
    }
}
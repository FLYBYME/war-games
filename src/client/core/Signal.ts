/**
 * Signal: A minimal reactive primitive for UI state management.
 */
export class Signal<T> {
    private value: T;
    private listeners: Set<(val: T) => void> = new Set();

    constructor(initial: T) {
        this.value = initial;
    }

    get(): T {
        return this.value;
    }

    set(newValue: T): void {
        if (this.value === newValue) return;
        this.value = newValue;
        this.notify();
    }

    update(fn: (val: T) => T): void {
        this.set(fn(this.value));
    }

    subscribe(listener: (val: T) => void): () => void {
        this.listeners.add(listener);
        listener(this.value);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach(l => l(this.value));
    }
}

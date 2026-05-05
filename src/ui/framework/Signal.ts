/**
 * Signal<T>: Reactive mutable state container.
 * Notifies subscribers on change. No VDOM — direct DOM updates only.
 */
export class Signal<T> {
    private value: T;
    private subscribers: Set<(val: T) => void> = new Set();

    constructor(initial: T) { this.value = initial; }

    get(): T { return this.value; }

    set(newVal: T) {
        if (this.value !== newVal) {
            this.value = newVal;
            this.subscribers.forEach(fn => fn(newVal));
        }
    }

    /** Mutate in-place (for objects/arrays) and force notify */
    update(fn: (val: T) => T) {
        this.value = fn(this.value);
        this.subscribers.forEach(sub => sub(this.value));
    }

    subscribe(fn: (val: T) => void): () => void {
        this.subscribers.add(fn);
        fn(this.value);
        return () => this.subscribers.delete(fn);
    }
}

/**
 * Computed<T>: Derived signal that auto-updates when dependencies change.
 */
export class Computed<T> {
    private signal: Signal<T>;
    private cleanups: Array<() => void> = [];

    constructor(compute: () => T, deps: Signal<any>[]) {
        this.signal = new Signal(compute());
        for (const dep of deps) {
            this.cleanups.push(dep.subscribe(() => {
                this.signal.set(compute());
            }));
        }
    }

    get(): T { return this.signal.get(); }
    subscribe(fn: (val: T) => void): () => void { return this.signal.subscribe(fn); }

    destroy() {
        this.cleanups.forEach(c => c());
        this.cleanups = [];
    }
}

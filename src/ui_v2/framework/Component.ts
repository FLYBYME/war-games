import { Signal } from './Signal';

/**
 * V2 Component: Base class for all UI elements.
 * Strict lifecycles: mount, render, update, unmount.
 * Mandates data-testid for E2E testability.
 */
export abstract class Component {
    public readonly element: HTMLElement;
    protected cleanupTasks: Array<() => void> = [];
    protected children: Component[] = [];
    private static injectedStyles = new Set<string>();

    constructor(tagName: string, className?: string, testId?: string) {
        this.element = document.createElement(tagName);
        if (className) this.element.className = className;
        if (testId) this.element.dataset.testid = testId;
    }

    /** 1. Programmatically construct the DOM */
    protected abstract render(): void;

    /** Optional: Scoped CSS injected on mount */
    protected styles(): string { return ''; }

    /** 2. Attach to parent and fire lifecycle hooks */
    public mount(parent: HTMLElement): void {
        this.injectStyles();
        this.render();
        parent.appendChild(this.element);
        this.onMount();
    }

    protected onMount(): void {}

    /** 3. Update hook (called manually or via reactive bindings) */
    public update(): void {
        this.onUpdate();
    }

    protected onUpdate(): void {}

    /** 4. Destroy component and cleanup */
    public unmount(): void {
        this.children.forEach(c => c.unmount());
        this.children = [];
        this.cleanupTasks.forEach(task => task());
        this.cleanupTasks = [];
        this.element.remove();
        this.onUnmount();
    }

    protected onUnmount(): void {}

    /** Enforced Element Creation: mandates test IDs for interactive elements */
    protected el<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        className?: string,
        textContent?: string,
        testId?: string
    ): HTMLElementTagNameMap[K] {
        const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
        if (interactiveTags.includes(tag) && !testId) {
            console.warn(`[E2E WARNING]: Interactive element <${tag}> created without a data-testid.`);
        }

        const el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent) el.textContent = textContent;
        if (testId) el.dataset.testid = testId;
        return el;
    }

    protected addChild(child: Component, container?: HTMLElement) {
        this.children.push(child);
        child.mount(container || this.element);
    }

    protected subscribe<T>(signal: Signal<T>, callback: (val: T) => void) {
        const unsub = signal.subscribe(callback);
        this.cleanupTasks.push(unsub);
    }

    protected listen<K extends keyof HTMLElementEventMap>(
        el: HTMLElement,
        event: K,
        handler: (e: HTMLElementEventMap[K]) => void
    ) {
        el.addEventListener(event, handler);
        this.cleanupTasks.push(() => el.removeEventListener(event, handler));
    }

    private injectStyles() {
        const css = this.styles();
        if (!css) return;

        const key = this.constructor.name;
        if (Component.injectedStyles.has(key)) return;
        Component.injectedStyles.add(key);

        const styleElement = document.createElement('style');
        styleElement.dataset.component = key;
        styleElement.textContent = css;
        document.head.appendChild(styleElement);
    }
}

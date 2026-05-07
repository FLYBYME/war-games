import { Signal } from './Signal';

/**
 * Component: Base class for all WGUI UI elements.
 * Strict mount/unmount lifecycle to prevent memory leaks.
 * Supports co-located component styles via styles() method.
 */
export abstract class Component {
    public readonly element: HTMLElement;
    protected cleanupTasks: Array<() => void> = [];
    protected children: Component[] = [];
    private styleElement: HTMLStyleElement | null = null;
    private static injectedStyles = new Set<string>();

    constructor(tagName: string, className?: string, testId?: string) {
        this.element = document.createElement(tagName);
        if (className) this.element.className = className;
        if (testId) this.element.dataset.testid = testId;
    }

    /** Build the DOM structure programmatically */
    protected abstract render(): void;

    /** Optional: return component-scoped CSS string */
    protected styles(): string { return ''; }

    /** Attach to parent DOM node */
    public mount(parent: HTMLElement): void {
        this.injectStyles();
        this.render();
        parent.appendChild(this.element);
        this.onMount();
    }

    protected onMount(): void {}

    /** Inject component styles once per class (deduped) */
    private injectStyles() {
        const css = this.styles();
        if (!css) return;

        const key = this.constructor.name;
        if (Component.injectedStyles.has(key)) return;
        Component.injectedStyles.add(key);

        this.styleElement = document.createElement('style');
        this.styleElement.dataset.component = key;
        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    /** Subscribe to a signal with automatic cleanup on unmount */
    protected subscribe<T>(signal: Signal<T>, callback: (val: T) => void) {
        const unsub = signal.subscribe(callback);
        this.cleanupTasks.push(unsub);
    }

    /** Add a DOM event listener with automatic cleanup */
    protected listen<K extends keyof HTMLElementEventMap>(
        el: HTMLElement,
        event: K,
        handler: (e: HTMLElementEventMap[K]) => void
    ) {
        el.addEventListener(event, handler);
        this.cleanupTasks.push(() => el.removeEventListener(event, handler));
    }

    /** Helper: create an element with class, optional text, and optional test ID */
    protected el<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        className?: string,
        textContent?: string,
        testId?: string
    ): HTMLElementTagNameMap[K] {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent) el.textContent = textContent;
        if (testId) el.dataset.testid = testId;
        return el;
    }

    /** Mount a child component */
    protected addChild(child: Component, container?: HTMLElement) {
        this.children.push(child);
        child.mount(container || this.element);
    }

    /** Destroy and cleanup */
    public unmount(): void {
        this.children.forEach(c => c.unmount());
        this.children = [];
        this.cleanupTasks.forEach(task => task());
        this.cleanupTasks = [];
        this.element.remove();
        this.onUnmount();
    }

    protected onUnmount(): void {}
}

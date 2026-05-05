/**
 * ListManager: A lightweight reconciliation engine for DOM lists.
 * Prevents DOM thrashing by reusing elements and updating them in place.
 */
export class ListManager<T> {
    private items = new Map<string, HTMLElement>();
    private container: HTMLElement;
    private keySelector: (item: T) => string;
    private renderItem: (item: T) => HTMLElement;
    private updateItem: (item: T, element: HTMLElement) => void;

    constructor(config: {
        container: HTMLElement;
        keySelector: (item: T) => string;
        renderItem: (item: T) => HTMLElement;
        updateItem: (item: T, element: HTMLElement) => void;
    }) {
        this.container = config.container;
        this.keySelector = config.keySelector;
        this.renderItem = config.renderItem;
        this.updateItem = config.updateItem;
    }

    /**
     * Synchronizes the DOM with a new array of data.
     * Reuses elements with the same key, updates them, and ensures correct DOM order.
     */
    public sync(data: T[]) {
        if (!data) {
            this.clear();
            return;
        }
        const activeKeys = new Set<string>();

        // 1. Update or Create
        data.forEach((item, index) => {
            const key = this.keySelector(item);
            activeKeys.add(key);

            let element = this.items.get(key);

            if (!element) {
                // Create new
                element = this.renderItem(item);
                this.items.set(key, element);
                this.container.insertBefore(element, this.container.children[index] || null);
            } else {
                // Update existing
                this.updateItem(item, element);
                
                // Ensure order is correct
                if (this.container.children[index] !== element) {
                    this.container.insertBefore(element, this.container.children[index] || null);
                }
            }
        });

        // 2. Cleanup orphaned elements
        for (const [key, element] of this.items.entries()) {
            if (!activeKeys.has(key)) {
                element.remove();
                this.items.delete(key);
            }
        }
    }

    /**
     * Completely purges the list.
     */
    public clear() {
        this.container.innerHTML = '';
        this.items.clear();
    }
}

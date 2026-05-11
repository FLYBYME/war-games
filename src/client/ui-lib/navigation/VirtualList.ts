// ui-lib/navigation/VirtualList.ts

import { BaseComponent } from '../BaseComponent';

export interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => BaseComponent<any> | HTMLElement;
    height?: string;
}

export class VirtualList<T> extends BaseComponent<VirtualListProps<T>> {
    private container: HTMLDivElement;
    private spacer: HTMLDivElement;
    private content: HTMLDivElement;

    constructor(props: VirtualListProps<T>) {
        super('div', props);

        this.container = document.createElement('div');
        this.spacer = document.createElement('div');
        this.content = document.createElement('div');

        this.element.appendChild(this.container);
        this.container.appendChild(this.spacer);
        this.container.appendChild(this.content);

        this.render();
        this.initScrollListener();
        this.initResizeObserver();
    }

    private initResizeObserver(): void {
        const observer = new ResizeObserver(() => {
            this.updateVisibleItems();
        });
        observer.observe(this.element);
    }

    public render(): void {
        const { height = '100%', items, itemHeight } = this.props;

        if (this.container.parentElement !== this.element) {
            this.element.appendChild(this.container);
        }

        this.applyStyles({
            height,
            width: '100%',
            overflowY: 'auto',
            position: 'relative',
        });

        this.container.style.position = 'relative';
        this.container.style.height = `${items.length * itemHeight}px`;

        this.content.style.position = 'absolute';
        this.content.style.top = '0';
        this.content.style.left = '0';
        this.content.style.width = '100%';

        this.updateVisibleItems();
    }

    private initScrollListener(): void {
        this.element.onscroll = () => this.updateVisibleItems();
    }

    private updateVisibleItems(): void {
        const { items, itemHeight, renderItem } = this.props;
        const scrollTop = this.element.scrollTop;
        const viewportHeight = this.element.clientHeight;

        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight));
        const endIndex = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / itemHeight));

        this.content.innerHTML = '';
        this.content.style.transform = `translateY(${startIndex * itemHeight}px)`;

        for (let i = startIndex; i < endIndex; i++) {
            const item = items[i];
            const rendered = renderItem(item, i);
            if (rendered instanceof BaseComponent) {
                this.content.appendChild(rendered.getElement());
            } else {
                this.content.appendChild(rendered);
            }
        }
    }

    public setItems(items: T[]): void {
        this.updateProps({ items });
    }
}

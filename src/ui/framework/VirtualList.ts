import { Component } from './Component';

/**
 * VirtualList: High-performance list rendering via DOM recycling.
 * Only renders visible rows. Critical for 5,000+ unit OOB lists.
 */
export class VirtualList<T> extends Component {
    private container!: HTMLElement;
    private spacer!: HTMLElement;
    private pool: HTMLElement[] = [];
    private scrollTop = 0;

    constructor(
        className: string,
        private items: T[],
        private rowHeight: number,
        private renderRow: (item: T, index: number, el: HTMLElement) => void,
        private onRowClick?: (item: T, index: number) => void
    ) {
        super('div', `virtual-list ${className}`);
    }

    public setItems(items: T[]) {
        this.items = items;
        this.spacer.style.height = `${items.length * this.rowHeight}px`;
        this.updateVisible();
    }

    protected render() {
        this.element.style.overflow = 'auto';
        this.element.style.position = 'relative';

        this.spacer = document.createElement('div');
        this.spacer.style.height = `${this.items.length * this.rowHeight}px`;
        this.spacer.style.position = 'relative';

        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.right = '0';

        this.spacer.appendChild(this.container);
        this.element.appendChild(this.spacer);
    }

    protected onMount() {
        this.listen(this.element, 'scroll', () => {
            this.scrollTop = this.element.scrollTop;
            this.updateVisible();
        });
        this.updateVisible();
    }

    private updateVisible() {
        const viewHeight = this.element.clientHeight || 400;
        const startIdx = Math.floor(this.scrollTop / this.rowHeight);
        const visibleCount = Math.ceil(viewHeight / this.rowHeight) + 2;
        const endIdx = Math.min(startIdx + visibleCount, this.items.length);

        // Grow pool if needed
        while (this.pool.length < visibleCount) {
            const row = document.createElement('div');
            row.className = 'virtual-list__row';
            row.style.height = `${this.rowHeight}px`;
            row.style.position = 'absolute';
            row.style.left = '0';
            row.style.right = '0';
            this.container.appendChild(row);
            this.pool.push(row);
        }

        // Hide excess pool rows
        for (let i = 0; i < this.pool.length; i++) {
            if (i < endIdx - startIdx) {
                const dataIdx = startIdx + i;
                const row = this.pool[i];
                row.style.display = '';
                row.style.transform = `translateY(${dataIdx * this.rowHeight}px)`;
                this.renderRow(this.items[dataIdx], dataIdx, row);

                // Re-bind click (cheap for small pool)
                row.onclick = this.onRowClick
                    ? () => this.onRowClick!(this.items[dataIdx], dataIdx)
                    : null;
            } else {
                this.pool[i].style.display = 'none';
            }
        }
    }
}

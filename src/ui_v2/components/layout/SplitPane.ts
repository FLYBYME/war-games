import { Component } from '../../framework/Component';

export type SplitDirection = 'horizontal' | 'vertical';

/**
 * SplitPane: A resizable container for two components.
 * Supports horizontal (side-by-side) or vertical (stacked) splitting.
 */
export class SplitPane extends Component {
    private isDragging = false;
    private ratio: number = 0.5; // 0.0 to 1.0
    private minSize: number = 50; // pixels

    constructor(
        private leftChild: Component,
        private rightChild: Component,
        private direction: SplitDirection = 'horizontal',
        initialRatio: number = 0.5
    ) {
        super('div', `split-pane split-${direction}`);
        this.ratio = initialRatio;
    }

    protected styles(): string {
        return `
            .split-pane {
                display: flex;
                width: 100%;
                height: 100%;
                overflow: hidden;
                position: relative;
            }
            .split-horizontal { flex-direction: row; }
            .split-vertical { flex-direction: column; }

            .split-pane-child {
                position: relative;
                overflow: hidden;
            }

            .split-divider {
                background: var(--bg-surface-2, #2a2a2a);
                position: relative;
                transition: background 0.2s;
                z-index: 10;
            }
            .split-divider:hover {
                background: var(--brand-primary, #00d1ff);
            }
            .split-horizontal > .split-divider {
                width: 4px;
                height: 100%;
                cursor: col-resize;
            }
            .split-vertical > .split-divider {
                height: 4px;
                width: 100%;
                cursor: row-resize;
            }
            
            .split-pane.dragging .split-divider {
                background: var(--brand-primary, #00d1ff);
            }
            .split-pane.dragging {
                pointer-events: none; /* Prevent interference during drag */
            }
        `;
    }

    private leftContainer!: HTMLElement;
    private rightContainer!: HTMLElement;

    protected render(): void {
        this.leftContainer = this.el('div', 'split-pane-child split-left');
        const divider = this.el('div', 'split-divider', '', 'split-divider');
        this.rightContainer = this.el('div', 'split-pane-child split-right');

        this.updateRatios(this.leftContainer, this.rightContainer);

        this.element.appendChild(this.leftContainer);
        this.element.appendChild(divider);
        this.element.appendChild(this.rightContainer);

        this.addChild(this.leftChild, this.leftContainer);
        this.addChild(this.rightChild, this.rightContainer);

        // Drag logic
        this.listen(divider, 'mousedown', (e) => this.startDrag(e as MouseEvent));
        this.listen(window, 'mousemove', (e) => this.onDrag(e as MouseEvent));
        this.listen(window, 'mouseup', () => this.stopDrag());
    }

    private startDrag(e: MouseEvent) {
        e.preventDefault();
        this.isDragging = true;
        this.element.classList.add('dragging');
    }

    private onDrag(e: MouseEvent) {
        if (!this.isDragging) return;

        const bounds = this.element.getBoundingClientRect();
        if (this.direction === 'horizontal') {
            const pos = e.clientX - bounds.left;
            this.ratio = Math.max(this.minSize / bounds.width, Math.min(1 - this.minSize / bounds.width, pos / bounds.width));
        } else {
            const pos = e.clientY - bounds.top;
            this.ratio = Math.max(this.minSize / bounds.height, Math.min(1 - this.minSize / bounds.height, pos / bounds.height));
        }

        this.updateRatios(this.leftContainer, this.rightContainer);
    }

    private stopDrag() {
        if (this.isDragging) {
            this.isDragging = false;
            this.element.classList.remove('dragging');
        }
    }

    private updateRatios(left: HTMLElement, right: HTMLElement) {
        const pct = (this.ratio * 100).toFixed(2);
        const invPct = (100 - this.ratio * 100).toFixed(2);
        
        if (this.direction === 'horizontal') {
            left.style.width = `calc(${pct}% - 2px)`;
            right.style.width = `calc(${invPct}% - 2px)`;
            left.style.height = '100%';
            right.style.height = '100%';
        } else {
            left.style.height = `calc(${pct}% - 2px)`;
            right.style.height = `calc(${invPct}% - 2px)`;
            left.style.width = '100%';
            right.style.width = '100%';
        }
    }
}

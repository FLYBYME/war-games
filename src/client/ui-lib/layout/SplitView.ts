// ui-lib/layout/SplitView.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface SplitViewProps {
    orientation?: 'horizontal' | 'vertical';
    panes: (BaseComponent<any> | Node)[];
    initialSizes?: number[]; // Percentages e.g. [30, 70]
    minSizes?: number[]; // Pixels e.g. [100, 100]
    minStackWidth?: number; // Pixels at which to stack vertically
}

export class SplitView extends BaseComponent<SplitViewProps> {
    private paneElements: HTMLElement[] = [];
    private sashes: HTMLElement[] = [];
    private resizeObserver: ResizeObserver | null = null;
    private isStacked: boolean = false;

    constructor(props: SplitViewProps) {
        super('div', props);
        this.render();
        this.initResizeObserver();
    }

    private initResizeObserver(): void {
        if (!this.props.minStackWidth) return;

        this.resizeObserver = new ResizeObserver(entries => {
            requestAnimationFrame(() => {
                if (!this.element) return;
                for (const entry of entries) {
                    const width = entry.contentRect.width;
                    const shouldStack = width < (this.props.minStackWidth || 0);

                    if (shouldStack !== this.isStacked) {
                        this.isStacked = shouldStack;
                        this.render();
                    }
                }
            });
        });
        this.resizeObserver.observe(this.element);
    }

    public render(): void {
        const {
            orientation = 'horizontal',
            panes,
            initialSizes = [],
            minSizes = [],
            minStackWidth
        } = this.props;

        const effectiveOrientation = this.isStacked ? 'vertical' : orientation;

        this.applyStyles({
            display: 'flex',
            flexDirection: effectiveOrientation === 'horizontal' ? 'row' : 'column',
            width: '100%',
            height: '100%',
            overflow: this.isStacked ? 'auto' : 'hidden',
            position: 'relative'
        });

        this.element.innerHTML = '';
        this.paneElements = [];
        this.sashes = [];

        panes.forEach((pane, index) => {
            const paneWrapper = document.createElement('div');
            Object.assign(paneWrapper.style, {
                flex: this.isStacked ? '0 0 auto' : (index < initialSizes.length ? `0 0 ${initialSizes[index]}%` : '1'),
                overflow: 'hidden',
                position: 'relative',
                minWidth: effectiveOrientation === 'horizontal' ? (minSizes[index] ? `${minSizes[index]}px` : '0') : '0',
                minHeight: effectiveOrientation === 'vertical' ? (minSizes[index] ? `${minSizes[index]}px` : (this.isStacked ? '300px' : '0')) : '0'
            });

            if (pane instanceof BaseComponent) {
                paneWrapper.appendChild(pane.getElement());
            } else {
                paneWrapper.appendChild(pane);
            }

            this.element.appendChild(paneWrapper);
            this.paneElements.push(paneWrapper);

            // Add sash after each pane except the last one, only if not stacked
            if (!this.isStacked && index < panes.length - 1) {
                const sash = document.createElement('div');
                Object.assign(sash.style, {
                    width: effectiveOrientation === 'horizontal' ? '4px' : '100%',
                    height: effectiveOrientation === 'vertical' ? '4px' : '100%',
                    backgroundColor: 'transparent',
                    cursor: effectiveOrientation === 'horizontal' ? 'col-resize' : 'row-resize',
                    zIndex: '10',
                    flexShrink: '0',
                    transition: 'background-color 0.2s'
                });

                sash.onmouseenter = () => sash.style.backgroundColor = Theme.colors.accent;
                sash.onmouseleave = () => sash.style.backgroundColor = 'transparent';

                this.setupDrag(sash, index);
                this.element.appendChild(sash);
                this.sashes.push(sash);
            }
        });
    }

    public destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        super.destroy();
    }

    private setupDrag(sash: HTMLElement, leftPaneIndex: number): void {
        let startPos = 0;
        let leftPaneStartSize = 0;
        let rightPaneStartSize = 0;

        const onMouseMove = (e: MouseEvent) => {
            const delta = (this.props.orientation === 'vertical' ? e.clientY : e.clientX) - startPos;
            const leftPane = this.paneElements[leftPaneIndex];
            const rightPane = this.paneElements[leftPaneIndex + 1];

            const leftSize = leftPaneStartSize + delta;
            const rightSize = rightPaneStartSize - delta;

            if (leftSize > 50 && rightSize > 50) { // Simple min size check
                leftPane.style.flex = `0 0 ${leftSize}px`;
                rightPane.style.flex = `1 1 auto`;
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
        };

        sash.onmousedown = (e: MouseEvent) => {
            e.preventDefault();
            startPos = this.props.orientation === 'vertical' ? e.clientY : e.clientX;
            leftPaneStartSize = this.props.orientation === 'vertical' ? this.paneElements[leftPaneIndex].offsetHeight : this.paneElements[leftPaneIndex].offsetWidth;
            rightPaneStartSize = this.props.orientation === 'vertical' ? this.paneElements[leftPaneIndex + 1].offsetHeight : this.paneElements[leftPaneIndex + 1].offsetWidth;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.cursor = this.props.orientation === 'horizontal' ? 'col-resize' : 'row-resize';
        };
    }
}

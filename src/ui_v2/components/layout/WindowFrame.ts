import { Component } from '../../framework/Component';
import { windowManager, WindowOptions } from '../../framework/WindowManager';

/**
 * WindowFrame: A draggable and resizable floating window.
 */
export class WindowFrame extends Component {
    private isDragging = false;
    private isResizing = false;
    private startX = 0;
    private startY = 0;
    private startW = 0;
    private startH = 0;
    private startLeft = 0;
    private startTop = 0;

    constructor(private options: WindowOptions, private content: Component) {
        super('div', 'window-frame');
        this.element.style.width = `${options.width}px`;
        this.element.style.height = `${options.height}px`;
        this.element.style.left = `${options.x}px`;
        this.element.style.top = `${options.y}px`;
        this.element.style.zIndex = windowManager.getNextZIndex().toString();
    }

    protected styles(): string {
        return `
            .window-frame {
                position: absolute;
                display: flex;
                flex-direction: column;
                background: var(--bg-surface, #1e1e1e);
                border: 1px solid var(--bg-surface-3, #3a3a3a);
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                min-width: 200px;
                min-height: 150px;
                overflow: hidden;
            }

            .window-frame.active {
                border-color: var(--brand-primary, #00d1ff);
            }

            .window-header {
                display: flex;
                align-items: center;
                height: 32px;
                background: var(--bg-surface-2, #2a2a2a);
                padding: 0 8px;
                cursor: grab;
                user-select: none;
            }
            .window-header:active { cursor: grabbing; }

            .window-title {
                flex: 1;
                font-size: 12px;
                font-weight: bold;
                color: var(--text-dim, #888);
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .active .window-title { color: var(--text-primary, #eee); }

            .window-controls {
                display: flex;
                gap: 4px;
            }
            .window-btn {
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                border-radius: 2px;
                font-size: 14px;
            }
            .window-btn:hover { background: rgba(255,255,255,0.1); }
            .window-close:hover { background: #e81123; color: white; }

            .window-body {
                flex: 1;
                position: relative;
                overflow: auto;
            }

            .window-resizer {
                position: absolute;
                right: 0;
                bottom: 0;
                width: 12px;
                height: 12px;
                cursor: nwse-resize;
                z-index: 100;
            }
        `;
    }

    protected render(): void {
        const header = this.el('div', 'window-header', '', 'window-header');
        const title = this.el('div', 'window-title', this.options.title);
        const controls = this.el('div', 'window-controls');
        const detachBtn = this.el('div', 'window-btn window-detach', '⧉', 'window-detach');
        const closeBtn = this.el('div', 'window-btn window-close', '×', 'window-close');
        
        const body = this.el('div', 'window-body', '', 'window-body');
        const resizer = this.el('div', 'window-resizer', '', 'window-resizer');

        controls.appendChild(detachBtn);
        controls.appendChild(closeBtn);
        header.appendChild(title);
        header.appendChild(controls);
        
        this.element.appendChild(header);
        this.element.appendChild(body);
        this.element.appendChild(resizer);

        this.addChild(this.content, body);

        // Subscriptions
        this.subscribe(windowManager.activeWindowId, id => {
            this.element.classList.toggle('active', id === this.options.id);
            if (id === this.options.id) {
                this.element.style.zIndex = windowManager.getNextZIndex().toString();
            }
        });

        // Event Listeners
        this.listen(header, 'mousedown', (e) => this.onDragStart(e as MouseEvent));
        this.listen(resizer, 'mousedown', (e) => this.onResizeStart(e as MouseEvent));
        this.listen(this.element, 'mousedown', () => windowManager.focus(this.options.id));
        this.listen(detachBtn, 'click', () => windowManager.detach(this.options.id));
        this.listen(closeBtn, 'click', () => windowManager.close(this.options.id));

        this.listen(window, 'mousemove', (e) => this.onMouseMove(e as MouseEvent));
        this.listen(window, 'mouseup', () => this.onMouseUp());
    }

    private onDragStart(e: MouseEvent) {
        if ((e.target as HTMLElement).closest('.window-btn')) return;
        this.isDragging = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startLeft = this.element.offsetLeft;
        this.startTop = this.element.offsetTop;
        e.preventDefault();
    }

    private onResizeStart(e: MouseEvent) {
        this.isResizing = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startW = this.element.offsetWidth;
        this.startH = this.element.offsetHeight;
        e.preventDefault();
        e.stopPropagation();
    }

    private onMouseMove(e: MouseEvent) {
        if (this.isDragging) {
            const dx = e.clientX - this.startX;
            const dy = e.clientY - this.startY;
            this.element.style.left = `${this.startLeft + dx}px`;
            this.element.style.top = `${this.startTop + dy}px`;
        } else if (this.isResizing) {
            const dx = e.clientX - this.startX;
            const dy = e.clientY - this.startY;
            this.element.style.width = `${Math.max(200, this.startW + dx)}px`;
            this.element.style.height = `${Math.max(150, this.startH + dy)}px`;
        }
    }

    private onMouseUp() {
        if (this.isDragging || this.isResizing) {
            windowManager.updateWindowBounds(this.options.id, {
                x: parseInt(this.element.style.left),
                y: parseInt(this.element.style.top),
                width: this.element.offsetWidth,
                height: this.element.offsetHeight
            });
        }
        this.isDragging = false;
        this.isResizing = false;
    }
}

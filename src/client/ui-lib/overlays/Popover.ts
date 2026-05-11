// ui-lib/overlays/Popover.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface PopoverProps {
    anchor: HTMLElement | BaseComponent<any>;
    content: (BaseComponent<any> | Node | string)[];
    placement?: 'top' | 'bottom' | 'left' | 'right';
    isOpen?: boolean;
    onClose?: () => void;
}

export class Popover extends BaseComponent<PopoverProps> {
    private popoverContainer: HTMLDivElement;
    private backdrop: HTMLDivElement;

    constructor(props: PopoverProps) {
        super('div', props);
        this.popoverContainer = document.createElement('div');
        this.backdrop = document.createElement('div');
        this.render();
    }

    public render(): void {
        const { content } = this.props;
        this.popoverContainer.innerHTML = '';

        // Backdrop to detect clicks outside
        Object.assign(this.backdrop.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '2000',
            display: 'none'
        });
        this.backdrop.onclick = () => this.hide();

        // Popover Container
        Object.assign(this.popoverContainer.style, {
            position: 'fixed',
            zIndex: '2001',
            backgroundColor: Theme.colors.bgPrimary,
            border: `1px solid ${Theme.colors.border}`,
            borderRadius: Theme.radius,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            padding: Theme.spacing.sm,
            display: 'none',
            minWidth: '150px'
        });

        content.forEach(child => {
            if (child instanceof BaseComponent) {
                this.popoverContainer.appendChild(child.getElement());
            } else if (typeof child === 'string') {
                const text = document.createElement('div');
                text.textContent = child;
                text.style.color = Theme.colors.textMain;
                text.style.padding = Theme.spacing.xs;
                this.popoverContainer.appendChild(text);
            } else {
                this.popoverContainer.appendChild(child);
            }
        });
    }

    public show(): void {
        const anchorEl = this.props.anchor instanceof BaseComponent
            ? this.props.anchor.getElement()
            : this.props.anchor;

        const rect = anchorEl.getBoundingClientRect();
        const placement = this.props.placement || 'bottom';

        document.body.appendChild(this.backdrop);
        document.body.appendChild(this.popoverContainer);

        this.backdrop.style.display = 'block';
        this.popoverContainer.style.display = 'block';

        const popRect = this.popoverContainer.getBoundingClientRect();
        let top = 0;
        let left = 0;

        switch (placement) {
            case 'bottom':
                top = rect.bottom + 5;
                left = rect.left;
                break;
            case 'top':
                top = rect.top - popRect.height - 5;
                left = rect.left;
                break;
            case 'left':
                top = rect.top;
                left = rect.left - popRect.width - 5;
                break;
            case 'right':
                top = rect.top;
                left = rect.right + 5;
                break;
        }

        // Viewport clamping
        if (left + popRect.width > window.innerWidth) left = window.innerWidth - popRect.width - 10;
        if (left < 0) left = 10;
        if (top + popRect.height > window.innerHeight) top = window.innerHeight - popRect.height - 10;
        if (top < 0) top = 10;

        this.popoverContainer.style.top = `${top}px`;
        this.popoverContainer.style.left = `${left}px`;
    }

    public hide(): void {
        this.backdrop.style.display = 'none';
        this.popoverContainer.style.display = 'none';
        if (this.props.onClose) this.props.onClose();

        if (this.backdrop.parentNode) document.body.removeChild(this.backdrop);
        if (this.popoverContainer.parentNode) document.body.removeChild(this.popoverContainer);
    }
}

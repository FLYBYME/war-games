// ui-lib/feedback/Tooltip.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface TooltipProps {
    text: string;
    target: HTMLElement;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export class Tooltip extends BaseComponent<TooltipProps> {
    private isVisible: boolean = false;

    constructor(props: TooltipProps) {
        super('div', props);
        this.render();
        this.initListeners();
    }

    public render(): void {
        const { text } = this.props;

        this.applyStyles({
            position: 'fixed',
            backgroundColor: Theme.colors.bgTertiary,
            color: Theme.colors.textMain,
            padding: `${Theme.spacing.xs} ${Theme.spacing.sm}`,
            borderRadius: Theme.radius,
            fontSize: '11px',
            pointerEvents: 'none',
            opacity: '0',
            transition: 'opacity 0.15s ease-in-out',
            zIndex: '1000',
            border: `1px solid ${Theme.colors.border}`,
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            display: 'none'
        });

        this.element.textContent = text;
        // Mount to body by default for fixed positioning
        document.body.appendChild(this.element);
    }

    private initListeners(): void {
        const { target } = this.props;

        target.addEventListener('mouseenter', () => this.show());
        target.addEventListener('mouseleave', () => this.hide());
    }

    private show(): void {
        this.isVisible = true;
        this.applyStyles({ display: 'block' });

        // Force a reflow for transition
        this.element.offsetHeight;

        this.positionTooltip();
        this.applyStyles({ opacity: '1' });
    }

    private hide(): void {
        this.isVisible = false;
        this.applyStyles({ opacity: '0' });

        setTimeout(() => {
            if (!this.isVisible) {
                this.applyStyles({ display: 'none' });
            }
        }, 150);
    }

    private positionTooltip(): void {
        const { target, position = 'top' } = this.props;
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = this.element.getBoundingClientRect();

        let top = 0;
        let left = 0;

        const gap = 8;

        switch (position) {
            case 'top':
                top = targetRect.top - tooltipRect.height - gap;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'bottom':
                top = targetRect.bottom + gap;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.left - tooltipRect.width - gap;
                break;
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.right + gap;
                break;
        }

        this.applyStyles({
            top: `${top}px`,
            left: `${left}px`
        });
    }

    public destroy(): void {
        super.destroy();
        // Additional cleanup if needed (e.g. removing listeners from target)
    }
}

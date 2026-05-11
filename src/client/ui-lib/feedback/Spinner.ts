// ui-lib/feedback/Spinner.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'accent' | 'muted';
}

export class Spinner extends BaseComponent<SpinnerProps> {
    constructor(props: SpinnerProps = {}) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const {
            size = 'sm',
            variant = 'accent'
        } = this.props;

        const sizePx = size === 'sm' ? '12px' : size === 'md' ? '20px' : '32px';
        const borderSize = size === 'sm' ? '2px' : size === 'md' ? '3px' : '4px';
        const color = variant === 'accent' ? Theme.colors.accent : Theme.colors.textMuted;

        this.applyStyles({
            width: sizePx,
            height: sizePx,
            border: `${borderSize} solid ${Theme.colors.bgTertiary}`,
            borderTop: `${borderSize} solid ${color}`,
            borderRadius: '50%',
            boxSizing: 'border-box'
        });

        this.addRotationAnimation();
    }

    private addRotationAnimation(): void {
        if (!document.getElementById('spinner-rotate-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-rotate-style';
            style.textContent = `
                @keyframes spinner-rotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        this.applyStyles({
            animation: 'spinner-rotate 0.8s infinite linear'
        });
    }
}

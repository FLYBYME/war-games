/**
 * ForceColorBadge — Side-aware colored indicator.
 *
 * Renders a small colored pill that indicates the force side
 * (Blue, Red, Neutral, Observer) with consistent tactical coloring.
 */

import { BaseComponent } from '../BaseComponent';

export type ForceColor = 'blue' | 'red' | 'neutral' | 'observer';

const FORCE_COLORS: Record<ForceColor, { bg: string; text: string; label: string }> = {
    blue: { bg: 'rgba(0, 188, 212, 0.2)', text: '#00bcd4', label: 'BLUE' },
    red: { bg: 'rgba(255, 152, 0, 0.2)', text: '#ff9800', label: 'RED' },
    neutral: { bg: 'rgba(158, 158, 158, 0.2)', text: '#9e9e9e', label: 'NEU' },
    observer: { bg: 'rgba(156, 39, 176, 0.2)', text: '#9c27b0', label: 'OBS' },
};

export interface ForceColorBadgeProps {
    side: ForceColor;
    showLabel?: boolean;
    size?: 'sm' | 'md';
}

export class ForceColorBadge extends BaseComponent<ForceColorBadgeProps> {
    constructor(props: ForceColorBadgeProps) {
        super('span', props);
        this.render();
    }

    public render(): void {
        const { side, showLabel = true, size = 'sm' } = this.props;
        const colors = FORCE_COLORS[side] ?? FORCE_COLORS.neutral;

        const dotSize = size === 'sm' ? '8px' : '10px';
        const fontSize = size === 'sm' ? '10px' : '11px';

        this.applyStyles({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            borderRadius: '10px',
            backgroundColor: colors.bg,
            color: colors.text,
            fontSize,
            fontWeight: '600',
            fontFamily: 'inherit',
            lineHeight: '1',
            letterSpacing: '0.05em',
        });

        this.element.innerHTML = '';

        // Color dot
        const dot = document.createElement('span');
        Object.assign(dot.style, {
            display: 'inline-block',
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            backgroundColor: colors.text,
        });
        this.element.appendChild(dot);

        // Label
        if (showLabel) {
            const label = document.createElement('span');
            label.textContent = colors.label;
            this.element.appendChild(label);
        }
    }
}

// ui-lib/typography/Text.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface TextProps {
    text: string;
    variant?: 'main' | 'muted' | 'error' | 'accent';
    size?: 'xs' | 'sm' | 'base' | 'lg';
    weight?: 'normal' | 'bold' | '500' | '600';
    monospace?: boolean;
    truncate?: boolean;     // Essential for sidebars and tree items
    selectable?: boolean;   // Usually false in IDE UI, true in logs/terminals
    onClick?: () => void;
}

export class Text extends BaseComponent<TextProps> {
    constructor(props: TextProps) {
        // We use a 'span' as the default inline text container
        super('span', props);
        this.render();
    }

    public render(): void {
        const {
            text,
            variant = 'main',
            size = 'base',
            weight = 'normal',
            monospace = false,
            truncate = false,
            selectable = false,
            onClick
        } = this.props;

        // Map variants to our Theme colors
        let color = Theme.colors.textMain;
        if (variant === 'muted') color = Theme.colors.textMuted;
        if (variant === 'accent') color = Theme.colors.accent;
        if (variant === 'error') color = Theme.colors.error; // Standard IDE error red

        // Map sizes (assuming base is 13px, sm is 11px, lg is 15px for an IDE)
        let fontSize = Theme.font?.sizeBase || '13px';
        if (size === 'xs') fontSize = '10px';
        if (size === 'sm') fontSize = '11px';
        if (size === 'lg') fontSize = '15px';

        this.applyStyles({
            color,
            fontSize,
            fontWeight: weight,
            fontFamily: monospace ? 'var(--font-mono, Consolas, "Courier New", monospace)' : 'inherit',
            userSelect: selectable ? 'auto' : 'none',
            lineHeight: '1.5',
            cursor: onClick ? 'pointer' : 'default',
        });

        // Handle truncation for tight layout areas (like left/right panels)
        if (truncate) {
            this.applyStyles({
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'block', // text-overflow requires block or inline-block
                maxWidth: '100%'
            });
        } else {
            this.applyStyles({ display: 'inline' });
        }

        // Setting textContent is much faster and safer than innerHTML
        this.element.textContent = text;

        // Attach event listener if provided
        if (onClick) {
            this.element.addEventListener('click', onClick);
            this.disposables.push({ dispose: () => this.element.removeEventListener('click', onClick) });
        }
    }
}
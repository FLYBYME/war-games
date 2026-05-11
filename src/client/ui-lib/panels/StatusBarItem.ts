// ui-lib/panels/StatusBarItem.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Text } from '../typography/Text';

export interface StatusBarItemProps {
    text: string;
    icon?: string;
    onClick?: (e: MouseEvent) => void;
    tooltip?: string;
    align?: 'left' | 'right';
}

export class StatusBarItem extends BaseComponent<StatusBarItemProps> {
    constructor(props: StatusBarItemProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const {
            text,
            icon,
            onClick,
            tooltip
        } = this.props;

        this.element.innerHTML = '';

        this.applyStyles({
            display: 'inline-flex',
            alignItems: 'center',
            height: '22px',
            padding: `0 ${Theme.spacing.sm}`,
            cursor: onClick ? 'pointer' : 'default',
            userSelect: 'none',
            fontSize: '11px',
            gap: '4px',
            color: Theme.colors.textMain,
            transition: 'background-color 0.1s'
        });

        // Reset interactive state
        this.element.onmouseenter = null;
        this.element.onmouseleave = null;
        this.element.onclick = null;
        this.element.title = tooltip || '';

        if (onClick) {
            this.element.onmouseenter = () => this.applyStyles({ backgroundColor: 'rgba(255, 255, 255, 0.1)' });
            this.element.onmouseleave = () => this.applyStyles({ backgroundColor: 'transparent' });
            this.element.onclick = (e) => {
                e.stopPropagation();
                onClick(e);
            };
        }

        if (icon) {
            const iconEl = document.createElement('i');
            iconEl.className = icon;
            iconEl.style.fontSize = '12px';
            this.element.appendChild(iconEl);
        }

        if (text) {
            const label = new Text({
                text,
                size: 'sm',
                variant: 'main'
            });
            this.element.appendChild(label.getElement());
        }
    }
}

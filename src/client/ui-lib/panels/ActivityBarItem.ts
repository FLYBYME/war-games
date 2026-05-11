// ui-lib/panels/ActivityBarItem.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Badge } from '../feedback/Badge';

export interface ActivityBarItemProps {
    icon: string;
    active?: boolean;
    badgeCount?: number | string;
    onClick?: (e: MouseEvent) => void;
    tooltip?: string;
}

export class ActivityBarItem extends BaseComponent<ActivityBarItemProps> {
    constructor(props: ActivityBarItemProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const {
            icon,
            active = false,
            badgeCount,
            onClick,
            tooltip
        } = this.props;

        this.element.innerHTML = '';

        this.applyStyles({
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            color: active ? Theme.colors.textMain : Theme.colors.textMuted,
            transition: 'color 0.2s'
        });

        if (onClick) {
            this.element.onclick = onClick;
        }

        if (tooltip) {
            this.element.title = tooltip;
        }

        this.element.onmouseenter = () => {
            if (!active) this.element.style.color = Theme.colors.textMain;
        };
        this.element.onmouseleave = () => {
            if (!active) this.element.style.color = Theme.colors.textMuted;
        };

        // Active indicator (left border)
        if (active) {
            const indicator = document.createElement('div');
            Object.assign(indicator.style, {
                position: 'absolute',
                left: '0',
                top: '0',
                bottom: '0',
                width: '2px',
                backgroundColor: Theme.colors.accent
            });
            this.element.appendChild(indicator);
        }

        // Icon
        const iconEl = document.createElement('i');
        iconEl.className = icon;
        iconEl.style.fontSize = '24px';
        this.element.appendChild(iconEl);

        // Badge
        if (badgeCount !== undefined) {
            const badge = new Badge({
                count: badgeCount,
                size: 'sm',
                variant: 'accent'
            });
            const badgeEl = badge.getElement();
            Object.assign(badgeEl.style, {
                position: 'absolute',
                top: '8px',
                right: '8px'
            });
            this.element.appendChild(badgeEl);
        }
    }
}

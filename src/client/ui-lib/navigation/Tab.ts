// ui-lib/navigation/Tab.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Text } from '../typography/Text';

export interface TabProps {
    label: string;
    icon?: string;
    active?: boolean;
    closable?: boolean;
    onClick?: (e: MouseEvent) => void;
    onClose?: (e: MouseEvent) => void;
}

export class Tab extends BaseComponent<TabProps> {
    constructor(props: TabProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const {
            label,
            icon,
            active = false,
            closable = true,
            onClick,
            onClose
        } = this.props;

        this.element.innerHTML = '';

        this.applyStyles({
            display: 'inline-flex',
            alignItems: 'center',
            padding: `0 ${Theme.spacing.md}`,
            height: '35px',
            backgroundColor: active ? Theme.colors.bgPrimary : Theme.colors.bgSecondary,
            borderRight: `1px solid ${Theme.colors.border}`,
            cursor: 'pointer',
            userSelect: 'none',
            position: 'relative',
            minWidth: '120px',
            maxWidth: '200px',
            boxSizing: 'border-box'
        });

        // Active indicator (bottom border)
        if (active) {
            const indicator = document.createElement('div');
            Object.assign(indicator.style, {
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                height: '2px',
                backgroundColor: Theme.colors.accent
            });
            this.element.appendChild(indicator);
        }

        // Icon
        if (icon) {
            const iconEl = document.createElement('i');
            iconEl.className = icon;
            iconEl.style.marginRight = '8px';
            iconEl.style.fontSize = '12px';
            this.element.appendChild(iconEl);
        }

        // Label
        const labelText = new Text({
            text: label,
            truncate: true,
            variant: active ? 'main' : 'muted',
            size: 'sm'
        });
        this.element.appendChild(labelText.getElement());

        // Close button
        if (closable) {
            const closeBtn = document.createElement('i');
            closeBtn.className = 'fas fa-times';
            Object.assign(closeBtn.style, {
                marginLeft: Theme.spacing.sm,
                fontSize: '10px',
                padding: '4px',
                borderRadius: '2px',
                visibility: active ? 'visible' : 'hidden', // Only show on active or hover
                opacity: active ? '0.8' : '0.5'
            });

            closeBtn.onclick = (e) => {
                e.stopPropagation();
                if (onClose) onClose(e);
            };

            closeBtn.onmouseenter = () => closeBtn.style.backgroundColor = Theme.colors.bgTertiary;
            closeBtn.onmouseleave = () => closeBtn.style.backgroundColor = 'transparent';

            this.element.appendChild(closeBtn);

            // Hover effects for the tab
            this.element.onmouseenter = () => {
                if (!active) this.applyStyles({ backgroundColor: Theme.colors.bgTertiary });
                closeBtn.style.visibility = 'visible';
            };
            this.element.onmouseleave = () => {
                if (!active) this.applyStyles({ backgroundColor: Theme.colors.bgSecondary });
                if (!active) closeBtn.style.visibility = 'hidden';
            };
        }

        if (onClick) {
            this.element.onclick = onClick;
        }
    }
}

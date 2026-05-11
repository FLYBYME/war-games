// ui-lib/navigation/Breadcrumb.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Text } from '../typography/Text';

export interface BreadcrumbItem {
    label: string;
    icon?: string;
    onClick?: (e: MouseEvent) => void;
}

export interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export class Breadcrumb extends BaseComponent<BreadcrumbProps> {
    constructor(props: BreadcrumbProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { items } = this.props;

        this.element.innerHTML = '';

        this.applyStyles({
            display: 'flex',
            alignItems: 'center',
            height: '22px',
            backgroundColor: 'transparent',
            padding: `0 ${Theme.spacing.sm}`,
            gap: '4px',
            overflow: 'hidden'
        });

        items.forEach((item, index) => {
            // Container for item to handle hover
            const itemContainer = document.createElement('div');
            Object.assign(itemContainer.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 4px',
                borderRadius: Theme.radius,
                cursor: 'pointer',
                userSelect: 'none'
            });

            itemContainer.onmouseenter = () => itemContainer.style.backgroundColor = Theme.colors.bgTertiary;
            itemContainer.onmouseleave = () => itemContainer.style.backgroundColor = 'transparent';

            if (item.onClick) {
                itemContainer.onclick = item.onClick;
            }

            // Icon
            if (item.icon) {
                const icon = document.createElement('i');
                icon.className = item.icon;
                icon.style.fontSize = '12px';
                icon.style.color = Theme.colors.textMuted;
                itemContainer.appendChild(icon);
            }

            // Text
            const text = new Text({
                text: item.label,
                variant: 'muted',
                size: 'sm'
            });
            itemContainer.appendChild(text.getElement());

            this.element.appendChild(itemContainer);

            // Separator
            if (index < items.length - 1) {
                const sep = document.createElement('i');
                sep.className = 'fas fa-chevron-right';
                Object.assign(sep.style, {
                    fontSize: '10px',
                    color: Theme.colors.textMuted,
                    opacity: '0.5',
                    margin: '0 2px'
                });
                this.element.appendChild(sep);
            }
        });
    }
}

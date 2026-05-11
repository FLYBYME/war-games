// ui-lib/navigation/TreeItem.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Stack } from '../layout/Stack';
import { Text } from '../typography/Text';

export interface TreeItemAction {
    icon: string;
    onClick: (e: MouseEvent) => void;
    tooltip?: string;
}

export interface TreeItemProps {
    label: string;
    icon?: string;
    depth?: number;
    expanded?: boolean;
    selected?: boolean;
    focused?: boolean;
    hasChildren?: boolean;
    actions?: TreeItemAction[];
    onClick?: (e: MouseEvent) => void;
    onToggle?: (e: MouseEvent) => void;
}

export class TreeItem extends BaseComponent<TreeItemProps> {
    constructor(props: TreeItemProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const {
            label,
            icon = 'far fa-file',
            depth = 0,
            expanded = false,
            selected = false,
            focused = false,
            hasChildren = false,
            actions = [],
            onClick,
            onToggle
        } = this.props;

        this.element.innerHTML = ''; // Clear previous render

        const indentSize = 12 * depth;

        this.applyStyles({
            display: 'flex',
            alignItems: 'center',
            padding: `4px ${Theme.spacing.sm}`,
            paddingLeft: `${indentSize + 8}px`,
            cursor: 'pointer',
            backgroundColor: selected ? Theme.colors.bgTertiary : 'transparent',
            outline: focused ? `1px solid ${Theme.colors.accent}` : 'none',
            outlineOffset: '-1px',
            userSelect: 'none',
            position: 'relative',
            height: '24px',
            boxSizing: 'border-box',
            color: selected ? Theme.colors.textMain : Theme.colors.textMuted
        });

        // Hover Effect
        this.element.onmouseenter = () => {
            if (!selected) this.applyStyles({ backgroundColor: 'rgba(255, 255, 255, 0.05)' });
            actionsContainer.style.display = 'flex';
        };
        this.element.onmouseleave = () => {
            if (!selected) this.applyStyles({ backgroundColor: 'transparent' });
            actionsContainer.style.display = 'none';
        };

        // Arrow for expandable items
        if (hasChildren) {
            const arrow = document.createElement('i');
            arrow.className = expanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
            arrow.style.fontSize = '10px';
            arrow.style.width = '16px';
            arrow.style.marginRight = '4px';
            arrow.style.textAlign = 'center';
            arrow.onclick = (e) => {
                e.stopPropagation();
                if (onToggle) onToggle(e);
            };
            this.element.appendChild(arrow);
        } else {
            // Spacer for alignment if no arrow
            const spacer = document.createElement('div');
            spacer.style.width = '20px';
            this.element.appendChild(spacer);
        }

        // Icon
        const iconEl = document.createElement('i');
        iconEl.className = icon;
        iconEl.style.marginRight = '8px';
        iconEl.style.width = '16px';
        iconEl.style.textAlign = 'center';
        this.element.appendChild(iconEl);

        // Label
        const labelText = new Text({ text: label, truncate: true });
        this.element.appendChild(labelText.getElement());

        // Actions Container (Hidden by default, shown on hover)
        const actionsContainer = document.createElement('div');
        Object.assign(actionsContainer.style, {
            display: 'none',
            marginLeft: 'auto',
            gap: '4px'
        });

        actions.forEach(action => {
            const actionBtn = document.createElement('i');
            actionBtn.className = action.icon;
            Object.assign(actionBtn.style, {
                padding: '2px',
                borderRadius: '2px',
                fontSize: '12px'
            });
            actionBtn.onclick = (e) => {
                e.stopPropagation();
                action.onClick(e);
            };
            actionBtn.onmouseenter = () => actionBtn.style.backgroundColor = Theme.colors.bgTertiary;
            actionBtn.onmouseleave = () => actionBtn.style.backgroundColor = 'transparent';
            actionsContainer.appendChild(actionBtn);
        });

        this.element.appendChild(actionsContainer);

        if (onClick) {
            this.element.onclick = onClick;
        }
    }
}

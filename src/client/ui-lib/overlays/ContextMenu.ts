// ui-lib/overlays/ContextMenu.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface ContextMenuAction {
    label: string;
    action: () => void;
    icon?: string;
    disabled?: boolean;
}

export interface ContextMenuSeparator {
    separator: true;
}

export interface ContextMenuSubmenu {
    label: string;
    items: ContextMenuItem[];
    icon?: string;
    disabled?: boolean;
}

export type ContextMenuItem = ContextMenuAction | ContextMenuSeparator | ContextMenuSubmenu;

export function isContextMenuSeparator(item: ContextMenuItem): item is ContextMenuSeparator {
    return 'separator' in item && (item as ContextMenuSeparator).separator === true;
}

export function isContextMenuSubmenu(item: ContextMenuItem): item is ContextMenuSubmenu {
    return 'items' in item && Array.isArray((item as ContextMenuSubmenu).items);
}

export class ContextMenu extends BaseComponent<{ items: ContextMenuItem[], x: number, y: number }> {
    private activeSubmenu: ContextMenu | null = null;
    private parentMenu: ContextMenu | null = null;
    private handleDocumentClick: (e: MouseEvent) => void;

    constructor(items: ContextMenuItem[], x: number, y: number, parentMenu?: ContextMenu) {
        super('div', { items, x, y });
        this.parentMenu = parentMenu || null;
        this.handleDocumentClick = this.onDocumentClick.bind(this);
        this.render();
        this.show();
    }

    public render(): void {
        const { items, x, y } = this.props;

        this.applyStyles({
            position: 'fixed',
            zIndex: '30000',
            minWidth: '180px',
            backgroundColor: Theme.colors.bgSecondary,
            border: `1px solid ${Theme.colors.border}`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            padding: '4px 0',
            borderRadius: Theme.radius,
            fontFamily: Theme.font.family,
            fontSize: Theme.font.sizeBase,
            color: Theme.colors.textMain,
            left: `${x}px`,
            top: `${y}px`
        });

        this.element.innerHTML = '';
        items.forEach(item => {
            this.element.appendChild(this.renderItem(item));
        });
    }

    private renderItem(item: ContextMenuItem): HTMLElement {
        if (isContextMenuSeparator(item)) {
            const sep = document.createElement('div');
            Object.assign(sep.style, {
                height: '1px',
                backgroundColor: Theme.colors.border,
                margin: '4px 0'
            });
            return sep;
        }

        const el = document.createElement('div');
        Object.assign(el.style, {
            display: 'flex',
            alignItems: 'center',
            gap: Theme.spacing.sm,
            padding: `4px ${Theme.spacing.md}`,
            cursor: 'default',
            whiteSpace: 'nowrap',
            color: item.disabled ? Theme.colors.textMuted : Theme.colors.textMain
        });

        if (item.disabled) {
            el.style.pointerEvents = 'none';
        } else {
            el.onmouseenter = () => {
                el.style.backgroundColor = Theme.colors.accent;
                el.style.color = '#fff';

                if (this.activeSubmenu) {
                    this.activeSubmenu.dispose();
                    this.activeSubmenu = null;
                }

                if (isContextMenuSubmenu(item)) {
                    const rect = el.getBoundingClientRect();
                    this.activeSubmenu = new ContextMenu(item.items, rect.right, rect.top, this);
                }
            };
            el.onmouseleave = () => {
                el.style.backgroundColor = 'transparent';
                el.style.color = Theme.colors.textMain;
            };

            if (!isContextMenuSubmenu(item)) {
                el.onclick = (e) => {
                    e.stopPropagation();
                    (item as ContextMenuAction).action();
                    this.disposeAll();
                };
            }
        }

        // Icon
        const iconWrap = document.createElement('span');
        iconWrap.style.width = '16px';
        iconWrap.style.display = 'inline-flex';
        iconWrap.style.justifyContent = 'center';
        if (item.icon) {
            const icon = document.createElement('i');
            icon.className = item.icon;
            iconWrap.appendChild(icon);
        }
        el.appendChild(iconWrap);

        // Label
        const label = document.createElement('span');
        label.textContent = item.label;
        label.style.flex = '1';
        el.appendChild(label);

        // Submenu chevron
        if (isContextMenuSubmenu(item)) {
            const chevron = document.createElement('i');
            chevron.className = 'fas fa-chevron-right';
            chevron.style.fontSize = '10px';
            chevron.style.opacity = '0.7';
            el.appendChild(chevron);
        } else {
            const spacer = document.createElement('span');
            spacer.style.width = '10px';
            el.appendChild(spacer);
        }

        return el;
    }

    private onDocumentClick(e: MouseEvent): void {
        if (!this.element.contains(e.target as Node)) {
            this.dispose();
        }
    }

    public show(): void {
        document.body.appendChild(this.element);
        if (!this.parentMenu) {
            requestAnimationFrame(() => {
                document.addEventListener('click', this.handleDocumentClick, { capture: true });
            });
        }

        // Clamp position
        requestAnimationFrame(() => {
            const rect = this.element.getBoundingClientRect();
            let newX = rect.left;
            let newY = rect.top;

            if (rect.right > window.innerWidth) {
                newX = this.parentMenu
                    ? this.parentMenu.element.getBoundingClientRect().left - rect.width
                    : window.innerWidth - rect.width - 4;
            }
            if (rect.bottom > window.innerHeight) {
                newY = window.innerHeight - rect.height - 4;
            }

            this.element.style.left = `${newX}px`;
            this.element.style.top = `${newY}px`;
        });
    }

    public dispose(): void {
        if (!this.parentMenu) {
            document.removeEventListener('click', this.handleDocumentClick, { capture: true });
        }
        if (this.activeSubmenu) {
            this.activeSubmenu.dispose();
            this.activeSubmenu = null;
        }
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    private disposeAll(): void {
        let root: ContextMenu = this;
        while (root.parentMenu) {
            root = root.parentMenu;
        }
        root.dispose();
    }
}

/**
 * EntityContextMenu — Right-click context menu for entities on the tactical map.
 *
 * Provides quick actions like:
 * - Inspect entity
 * - Set waypoint
 * - Delete entity
 * - Assign mission
 * - Focus camera
 */

export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
    separator?: boolean;
    handler?: () => void;
}

export class ContextMenuService {
    private menuEl: HTMLElement | null = null;

    /**
     * Show a context menu at the given screen coordinates.
     */
    public show(x: number, y: number, items: ContextMenuItem[]): void {
        this.hide(); // Remove existing menu

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        Object.assign(menu.style, {
            position: 'fixed',
            left: `${x}px`,
            top: `${y}px`,
            zIndex: '30000',
            minWidth: '180px',
        });

        for (const item of items) {
            if (item.separator) {
                const sep = document.createElement('div');
                sep.className = 'context-menu-separator';
                menu.appendChild(sep);
                continue;
            }

            const row = document.createElement('div');
            row.className = `context-menu-item${item.disabled ? ' disabled' : ''}`;

            if (item.icon) {
                const icon = document.createElement('i');
                icon.className = item.icon;
                icon.style.width = '16px';
                icon.style.textAlign = 'center';
                icon.style.fontSize = '12px';
                row.appendChild(icon);
            }

            const label = document.createElement('span');
            label.textContent = item.label;
            row.appendChild(label);

            if (item.handler && !item.disabled) {
                row.addEventListener('click', () => {
                    this.hide();
                    item.handler?.();
                });
            }

            menu.appendChild(row);
        }

        document.body.appendChild(menu);
        this.menuEl = menu;

        // Close on click outside
        const closeHandler = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
                this.hide();
                document.removeEventListener('click', closeHandler);
            }
        };
        // Delay to avoid immediate close from the triggering right-click
        setTimeout(() => {
            document.addEventListener('click', closeHandler);
        }, 0);

        // Also close on Escape
        const escHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                this.hide();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Ensure the menu stays within viewport
        requestAnimationFrame(() => {
            const rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = `${window.innerWidth - rect.width - 4}px`;
            }
            if (rect.bottom > window.innerHeight) {
                menu.style.top = `${window.innerHeight - rect.height - 4}px`;
            }
        });
    }

    /**
     * Hide the active context menu.
     */
    public hide(): void {
        if (this.menuEl) {
            this.menuEl.remove();
            this.menuEl = null;
        }
    }

    /**
     * Build entity-specific menu items.
     */
    public static buildEntityMenu(
        entityId: string,
        options: {
            onInspect?: () => void;
            onDelete?: () => void;
            onFocus?: () => void;
            onSetWaypoint?: () => void;
            onAssignMission?: () => void;
        }
    ): ContextMenuItem[] {
        return [
            {
                id: 'inspect',
                label: `Inspect ${entityId.substring(0, 8)}...`,
                icon: 'fas fa-search',
                handler: options.onInspect,
            },
            {
                id: 'focus',
                label: 'Focus Camera',
                icon: 'fas fa-crosshairs',
                handler: options.onFocus,
            },
            { id: 'sep1', label: '', separator: true },
            {
                id: 'waypoint',
                label: 'Set Waypoint...',
                icon: 'fas fa-map-marker-alt',
                handler: options.onSetWaypoint,
            },
            {
                id: 'mission',
                label: 'Assign Mission...',
                icon: 'fas fa-tasks',
                handler: options.onAssignMission,
            },
            { id: 'sep2', label: '', separator: true },
            {
                id: 'delete',
                label: 'Delete Entity',
                icon: 'fas fa-trash',
                handler: options.onDelete,
            },
        ];
    }
}

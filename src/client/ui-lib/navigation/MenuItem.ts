// ui-lib/navigation/MenuItem.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Text } from '../typography/Text';

export interface MenuItemProps {
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    items?: MenuItemProps[];
    disabled?: boolean;
    onClick?: () => void;
    command?: string;
    active?: boolean;
    separator?: boolean;
}

export class MenuItem extends BaseComponent<MenuItemProps> {
    private dropdown: HTMLElement | null = null;
    private isOpen: boolean = false;
    private handleDocumentClick: (e: MouseEvent) => void;

    constructor(props: MenuItemProps) {
        super('div', props);
        this.handleDocumentClick = this.onDocumentClick.bind(this);

        // Listen for close signal from sub-menus
        this.element.addEventListener('menu-close', () => this.close());

        this.render();
    }

    public render(): void {
        const { label, icon, shortcut, items, disabled, active, separator, command } = this.props;

        this.element.innerHTML = '';

        if (separator) {
            this.applyStyles({
                height: '1px',
                backgroundColor: Theme.colors.border,
                margin: '4px 8px',
                padding: '0',
                cursor: 'default',
                pointerEvents: 'none'
            });
            return;
        }

        this.applyStyles({
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${Theme.spacing.md}`,
            height: '100%',
            cursor: disabled ? 'default' : 'pointer',
            fontSize: '13px',
            color: disabled ? Theme.colors.textMuted : Theme.colors.textMain,
            backgroundColor: active ? Theme.colors.accent : 'transparent',
            position: 'relative',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            gap: Theme.spacing.sm,
            transition: 'background-color 0.2s'
        });

        if (!disabled) {
            this.element.onmouseenter = () => {
                if (!active) this.element.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            };
            this.element.onmouseleave = () => {
                if (!active) this.element.style.backgroundColor = 'transparent';
            };
            this.element.onclick = (e) => {
                e.stopPropagation(); // Avoid triggering parent menus
                if (items && items.length > 0) {
                    this.toggle();
                } else {
                    if (command) {
                        if (this.props.onClick) this.props.onClick();
                        const event = new CustomEvent('menu-item-click', {
                            detail: { command, id: this.props.id },
                            bubbles: true
                        });
                        this.element.dispatchEvent(event);
                    } else if (this.props.onClick) {
                        this.props.onClick();
                    }

                    // Signal to all parent menus to close
                    this.element.dispatchEvent(new CustomEvent('menu-close', { bubbles: true }));
                }
            };
        }

        if (icon) {
            const iconEl = document.createElement('i');
            iconEl.className = icon;
            iconEl.style.width = '16px';
            iconEl.style.textAlign = 'center';
            this.element.appendChild(iconEl);
        }

        const labelEl = new Text({ text: label, size: 'sm' });
        this.element.appendChild(labelEl.getElement());

        if (shortcut) {
            const shortcutEl = document.createElement('span');
            shortcutEl.textContent = shortcut;
            Object.assign(shortcutEl.style, {
                marginLeft: 'auto',
                opacity: '0.5',
                fontSize: '11px',
                paddingLeft: Theme.spacing.lg
            });
            this.element.appendChild(shortcutEl);
        }

        if (items && items.length > 0) {
            const chevron = document.createElement('i');
            chevron.className = 'fas fa-chevron-right';
            chevron.style.fontSize = '10px';
            chevron.style.marginLeft = 'auto';
            this.element.appendChild(chevron);

            this.createDropdown(items);
        }
    }

    private createDropdown(items: MenuItemProps[]): void {
        this.dropdown = document.createElement('div');


        Object.assign(this.dropdown.style, {
            position: 'absolute',
            backgroundColor: Theme.colors.bgSecondary,
            border: `1px solid ${Theme.colors.border}`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            padding: '4px 0',
            borderRadius: Theme.radius,
            zIndex: '1000',
            display: 'none',
            minWidth: '200px'
        });

        items.forEach(itemProps => {
            const subItem = new MenuItem(itemProps);
            // Ensure sub-items in the dropdown have a fixed height
            subItem.getElement().style.height = '28px';
            this.dropdown!.appendChild(subItem.getElement());
        });

        this.element.appendChild(this.dropdown);
    }

    private toggle(): void {
        this.isOpen ? this.close() : this.open();
    }

    public open(): void {
        if (this.dropdown) {
            // Determine if this is a top-level menu item dynamically when opening
            let isTopLevel = false;
            let parent: HTMLElement | null = this.element.parentElement;
            while (parent) {
                if (parent.classList.contains('menu-bar')) {
                    isTopLevel = true;
                    break;
                }
                parent = parent.parentElement;
            }

            // Update dropdown positioning based on current state
            Object.assign(this.dropdown.style, {
                top: isTopLevel ? '100%' : '0',
                left: isTopLevel ? '0' : '100%',
                display: 'block'
            });

            this.isOpen = true;
            document.addEventListener('click', this.handleDocumentClick);
        }
    }

    public close(): void {
        if (this.dropdown) {
            this.dropdown.style.display = 'none';
            this.isOpen = false;
            document.removeEventListener('click', this.handleDocumentClick);
        }
    }

    private onDocumentClick(e: MouseEvent): void {
        if (this.isOpen && !this.element.contains(e.target as Node)) {
            this.close();
        }
    }

    public dispose(): void {
        document.removeEventListener('click', this.handleDocumentClick);
        super.dispose();
    }
}

// ui-lib/navigation/MenuBar.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { MenuItem, MenuItemProps } from './MenuItem';

export class MenuBar extends BaseComponent<{}> {
    private items: MenuItem[] = [];

    constructor() {
        super('div', {});
        this.render();
    }

    public render(): void {
        this.applyStyles({
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            padding: '0',
            gap: '0'
        });
        this.addClasses('menu-bar');

        this.element.innerHTML = '';
        this.items.forEach(item => {
            this.element.appendChild(item.getElement());
        });
    }

    public addMenuItem(props: MenuItemProps): MenuItem {
        // Replace existing item if ID matches to prevent duplicates and enable updates
        if (props.id) {
            const existingIndex = this.items.findIndex(item => item.props.id === props.id);
            if (existingIndex !== -1) {
                const oldItem = this.items[existingIndex];
                const newItem = new MenuItem(props);

                this.element.replaceChild(newItem.getElement(), oldItem.getElement());
                this.items[existingIndex] = newItem;
                this.setupItemListener(newItem);
                oldItem.dispose();
                return newItem;
            }
        }

        const item = new MenuItem(props);
        this.items.push(item);
        this.element.appendChild(item.getElement());
        this.setupItemListener(item);
        return item;
    }

    private setupItemListener(item: MenuItem): void {
        item.getElement().addEventListener('menu-item-click', (e: any) => {
            const { command } = e.detail;
            if (command) {
                const event = new CustomEvent('menu-command', {
                    detail: { command },
                    bubbles: true
                });
                this.element.dispatchEvent(event);
            }
        });
    }

    public dispose(): void {
        this.items.forEach(item => item.dispose());
        this.items = [];
        super.dispose();
    }
}

// ui-lib/panels/StatusBar.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { StatusBarItem, StatusBarItemProps } from './StatusBarItem';

export class StatusBar extends BaseComponent<{}> {
    private leftContainer: HTMLElement;
    private rightContainer: HTMLElement;
    private items: Map<string, StatusBarItem> = new Map();

    constructor() {
        super('div', {});
        this.leftContainer = document.createElement('div');
        this.rightContainer = document.createElement('div');
        this.render();
        // Status bar starts empty. Extensions register items via addItem().
    }

    public render(): void {
        this.applyStyles({
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '22px',
            backgroundColor: Theme.colors.bgSecondary,
            borderTop: `1px solid ${Theme.colors.border}`,
            padding: `0 ${Theme.spacing.xs}`,
            fontSize: '11px',
            color: Theme.colors.textMain,
            userSelect: 'none',
            zIndex: '100'
        });

        this.element.innerHTML = '';

        this.leftContainer.style.display = 'flex';
        this.leftContainer.style.alignItems = 'center';
        this.leftContainer.style.height = '100%';

        this.rightContainer.style.display = 'flex';
        this.rightContainer.style.alignItems = 'center';
        this.rightContainer.style.height = '100%';

        this.element.appendChild(this.leftContainer);
        this.element.appendChild(this.rightContainer);
    }


    public addItem(id: string, props: StatusBarItemProps, position: 'left' | 'right' = 'left'): StatusBarItem {
        const item = new StatusBarItem(props);
        this.items.set(id, item);

        if (position === 'left') {
            this.leftContainer.appendChild(item.getElement());
        } else {
            this.rightContainer.appendChild(item.getElement());
        }

        return item;
    }

    public getItem(id: string): StatusBarItem | undefined {
        return this.items.get(id);
    }

    public setMessage(message: string): void {
        const item = this.getItem('notification-status');
        if (item) {
            item.updateProps({ text: message });
        }
    }

    public setBranch(text: string): void {
        const item = this.getItem('branch');
        if (item) item.updateProps({ text });
    }

    public setErrors(count: number): void {
        const item = this.getItem('errors');
        if (item) item.updateProps({ text: `${count} error${count === 1 ? '' : 's'}` });
    }

    public setWarnings(count: number): void {
        const item = this.getItem('warnings');
        if (item) item.updateProps({ text: `${count} warning${count === 1 ? '' : 's'}` });
    }

    public showItem(id: string): void {
        const item = this.getItem(id);
        if (item) item.getElement().style.display = 'inline-flex';
    }

    public hideItem(id: string): void {
        const item = this.getItem(id);
        if (item) item.getElement().style.display = 'none';
    }

    public dispose(): void {
        this.items.forEach(item => item.dispose());
        this.items.clear();
        super.dispose();
    }
}

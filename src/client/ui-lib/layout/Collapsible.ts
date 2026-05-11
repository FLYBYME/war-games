// ui-lib/layout/Collapsible.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface CollapsibleProps {
    title: string | BaseComponent<any> | Node;
    children: (BaseComponent<any> | Node | string)[];
    isOpen?: boolean;
    onToggle?: (isOpen: boolean) => void;
}

export class Collapsible extends BaseComponent<CollapsibleProps> {
    private contentElement: HTMLDivElement;
    private chevron: HTMLElement;
    private isOpen: boolean;

    constructor(props: CollapsibleProps) {
        super('div', props);
        this.isOpen = props.isOpen ?? false;
        this.contentElement = document.createElement('div');
        this.chevron = document.createElement('i');
        this.render();
    }

    public render(): void {
        const { title, children } = this.props;

        this.applyStyles({
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            overflow: 'hidden'
        });

        // Header
        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            padding: `${Theme.spacing.xs} ${Theme.spacing.sm}`,
            backgroundColor: Theme.colors.bgSecondary,
            cursor: 'pointer',
            userSelect: 'none',
            fontSize: '11px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            color: Theme.colors.textMain,
            gap: Theme.spacing.xs,
            borderBottom: `1px solid ${Theme.colors.border}`
        });

        header.onclick = () => this.toggle();

        // Chevron
        this.chevron.className = this.isOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
        this.chevron.style.width = '12px';
        this.chevron.style.textAlign = 'center';
        header.appendChild(this.chevron);

        // Title
        const titleContainer = document.createElement('div');
        titleContainer.style.flex = '1';
        if (title instanceof BaseComponent) {
            titleContainer.appendChild(title.getElement());
        } else if (title instanceof Node) {
            titleContainer.appendChild(title);
        } else {
            titleContainer.textContent = title;
        }
        header.appendChild(titleContainer);

        // Content
        this.contentElement.style.display = this.isOpen ? 'block' : 'none';
        this.contentElement.style.width = '100%';
        this.contentElement.innerHTML = '';

        children.forEach(child => {
            if (child instanceof BaseComponent) {
                this.contentElement.appendChild(child.getElement());
            } else if (typeof child === 'string') {
                this.contentElement.appendChild(document.createTextNode(child));
            } else {
                this.contentElement.appendChild(child);
            }
        });

        this.element.appendChild(header);
        this.element.appendChild(this.contentElement);
    }

    public toggle(open?: boolean): void {
        this.isOpen = open !== undefined ? open : !this.isOpen;
        this.contentElement.style.display = this.isOpen ? 'block' : 'none';
        this.chevron.className = this.isOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-right';

        if (this.props.onToggle) {
            this.props.onToggle(this.isOpen);
        }
    }

    public setOpen(open: boolean): void {
        this.toggle(open);
    }
}

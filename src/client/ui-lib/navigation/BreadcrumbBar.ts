import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Text } from '../typography/Text';
import { Popover } from '../overlays/Popover';
import { VirtualList } from './VirtualList';

export interface BreadcrumbBarItem {
    label: string;
    icon?: string;
    onClick?: () => void;
    getSiblings?: () => { label: string; icon?: string; onClick: () => void }[];
}

export interface BreadcrumbBarProps {
    items: BreadcrumbBarItem[];
}

export class BreadcrumbBar extends BaseComponent<BreadcrumbBarProps> {
    constructor(props: BreadcrumbBarProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        this.element.innerHTML = '';
        this.applyStyles({
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: `0 ${Theme.spacing.xs}`,
            height: '22px',
            overflow: 'hidden'
        });

        this.props.items.forEach((item, index) => {
            this.appendChildren(this.createItem(item));

            if (index < this.props.items.length - 1) {
                this.appendChildren(this.createSeparator(item));
            }
        });
    }

    private createItem(item: BreadcrumbBarItem): HTMLElement {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            alignItems: 'center',
            gap: Theme.spacing.xs,
            padding: `2px ${Theme.spacing.xs}`,
            borderRadius: Theme.radius,
            cursor: 'pointer',
            color: Theme.colors.textMuted
        });

        container.onmouseenter = () => {
            container.style.backgroundColor = Theme.colors.bgTertiary;
            container.style.color = Theme.colors.textMain;
        };
        container.onmouseleave = () => {
            container.style.backgroundColor = 'transparent';
            container.style.color = Theme.colors.textMuted;
        };
        if (item.onClick) container.onclick = item.onClick;

        if (item.icon) {
            const i = document.createElement('i');
            i.className = item.icon;
            i.style.fontSize = '12px';
            container.appendChild(i);
        }

        const label = new Text({ text: item.label, size: 'sm' });
        container.appendChild(label.getElement());

        return container;
    }

    private createSeparator(item: BreadcrumbBarItem): HTMLElement {
        const sep = document.createElement('i');
        sep.className = 'fas fa-chevron-right';
        Object.assign(sep.style, {
            fontSize: '10px',
            padding: '4px',
            cursor: item.getSiblings ? 'pointer' : 'default',
            opacity: '0.5'
        });

        if (item.getSiblings) {
            sep.onmouseenter = () => sep.style.opacity = '1';
            sep.onmouseleave = () => sep.style.opacity = '0.5';
            sep.onclick = (e) => {
                const siblings = item.getSiblings!();
                const list = new VirtualList({
                    items: siblings,
                    itemHeight: 24,
                    height: '200px',
                    renderItem: (s) => {
                        const el = document.createElement('div');
                        el.style.padding = `4px ${Theme.spacing.sm}`;
                        el.style.cursor = 'pointer';
                        el.textContent = s.label;
                        el.onclick = () => {
                            s.onClick();
                            popover.hide();
                        };
                        return el;
                    }
                });

                const popover = new Popover({
                    anchor: sep,
                    content: [list],
                    placement: 'bottom'
                });
                popover.show();
            };
        }
        return sep;
    }
}
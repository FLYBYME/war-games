// src/client/ui-lib/layout/Accordion.ts
import { BaseComponent } from '../BaseComponent';
import { Collapsible } from './Collapsible';

export interface AccordionProps {
    items: {
        title: string;
        content: (BaseComponent<any> | HTMLElement)[];
        expanded?: boolean;
    }[];
}

export class Accordion extends BaseComponent<AccordionProps> {
    private collapsibles: Collapsible[] = [];

    constructor(props: AccordionProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { items } = this.props;
        this.element.innerHTML = '';
        this.collapsibles = [];

        items.forEach((item, index) => {
            const c = new Collapsible({
                title: item.title,
                children: item.content,
                isOpen: item.expanded || false,
                onToggle: (expanded) => {
                    if (expanded) {
                        this.handleToggle(index);
                    }
                }
            });
            this.collapsibles.push(c);
            this.element.appendChild(c.getElement());
        });
    }

    private handleToggle(activeIndex: number): void {
        this.collapsibles.forEach((c, i) => {
            if (i !== activeIndex) {
                c.toggle(false);
            }
        });
    }
}

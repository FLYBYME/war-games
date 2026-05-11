import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Row } from '../layout/Row';
import { Stack } from '../layout/Stack';
import { Text } from '../typography/Text';

export interface PropertyItem {
    label: string;
    description?: string;
    control: BaseComponent<any> | HTMLElement;
}

export interface PropertyGridProps {
    items: PropertyItem[];
}

export class PropertyGrid extends BaseComponent<PropertyGridProps> {
    constructor(props: PropertyGridProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        this.element.innerHTML = '';

        const container = new Stack({
            direction: 'column',
            gap: 'md',
            width: '100%'
        });

        this.props.items.forEach(item => {
            const row = new Row({
                align: 'center',
                justify: 'space-between',
                padding: 'none'
            });

            const labelStack = new Stack({ direction: 'column', gap: 'xs' });
            labelStack.appendChildren(new Text({ text: item.label, weight: '600' }));

            if (item.description) {
                labelStack.appendChildren(new Text({
                    text: item.description,
                    variant: 'muted',
                    size: 'sm'
                }));
            }

            const controlContainer = document.createElement('div');
            controlContainer.style.minWidth = '120px';
            controlContainer.style.display = 'flex';
            controlContainer.style.justifyContent = 'flex-end';

            if (item.control instanceof BaseComponent) {
                controlContainer.appendChild(item.control.getElement());
            } else {
                controlContainer.appendChild(item.control);
            }

            row.appendChildren(labelStack, controlContainer);
            container.appendChildren(row);
        });

        this.appendChildren(container);
    }
}
// ui-lib/forms/RadioGroup.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface RadioOption {
    label: string;
    value: string;
}

export interface RadioGroupProps {
    options: RadioOption[];
    value?: string;
    name: string;
    onChange?: (value: string) => void;
}

export class RadioGroup extends BaseComponent<RadioGroupProps> {
    constructor(props: RadioGroupProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { options, value, name } = this.props;

        this.applyStyles({
            display: 'flex',
            flexDirection: 'column',
            gap: Theme.spacing.sm
        });

        this.element.innerHTML = '';

        options.forEach(option => {
            const container = document.createElement('label');
            Object.assign(container.style, {
                display: 'flex',
                alignItems: 'center',
                gap: Theme.spacing.sm,
                cursor: 'pointer',
                userSelect: 'none',
                color: Theme.colors.textMain,
                fontSize: Theme.font.sizeBase
            });

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = name;
            radio.value = option.value;
            radio.checked = option.value === value;
            Object.assign(radio.style, {
                accentColor: Theme.colors.accent,
                cursor: 'pointer'
            });

            radio.onchange = () => {
                if (radio.checked) {
                    this.updateProps({ value: option.value });
                    if (this.props.onChange) this.props.onChange(option.value);
                }
            };

            container.appendChild(radio);
            container.appendChild(document.createTextNode(option.label));
            this.element.appendChild(container);
        });
    }
}

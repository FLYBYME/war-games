// ui-lib/forms/Slider.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface SliderProps {
    min: number;
    max: number;
    step?: number;
    value?: number;
    onChange?: (value: number) => void;
    label?: string;
}

export class Slider extends BaseComponent<SliderProps> {
    private input: HTMLInputElement;

    constructor(props: SliderProps) {
        super('div', props);
        this.input = document.createElement('input');
        this.render();
    }

    public render(): void {
        const { min, max, step = 1, value = min, label } = this.props;

        this.applyStyles({
            display: 'flex',
            flexDirection: 'column',
            gap: Theme.spacing.xs,
            width: '100%'
        });

        if (label) {
            const labelEl = document.createElement('span');
            labelEl.textContent = label;
            labelEl.style.fontSize = Theme.font.sizeBase;
            labelEl.style.color = Theme.colors.textMain;
            this.element.appendChild(labelEl);
        }

        Object.assign(this.input.style, {
            width: '100%',
            accentColor: Theme.colors.accent,
            cursor: 'pointer'
        });
        this.input.type = 'range';
        this.input.min = min.toString();
        this.input.max = max.toString();
        this.input.step = step.toString();
        this.input.value = value.toString();

        this.input.oninput = () => {
            const nextValue = parseFloat(this.input.value);
            if (this.props.onChange) this.props.onChange(nextValue);
        };

        this.element.appendChild(this.input);
    }
}

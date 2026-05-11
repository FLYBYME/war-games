// src/client/ui-lib/forms/DatePicker.ts
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface DatePickerProps {
    value?: string; // YYYY-MM-DD
    onChange: (date: string) => void;
    label?: string;
}

export class DatePicker extends BaseComponent<DatePickerProps> {
    constructor(props: DatePickerProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { value, onChange, label } = this.props;

        this.applyStyles({
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontFamily: Theme.font.family
        });

        this.element.innerHTML = '';

        if (label) {
            const labelEl = document.createElement('label');
            Object.assign(labelEl.style, {
                fontSize: '11px',
                fontWeight: '600',
                color: Theme.colors.textMuted,
                textTransform: 'uppercase'
            });
            labelEl.textContent = label;
            this.element.appendChild(labelEl);
        }

        const input = document.createElement('input');
        input.type = 'date';
        input.value = value || '';
        Object.assign(input.style, {
            padding: '6px 10px',
            backgroundColor: Theme.colors.bgSecondary,
            border: `1px solid ${Theme.colors.border}`,
            borderRadius: Theme.radius,
            color: Theme.colors.textMain,
            fontSize: '13px',
            outline: 'none',
            fontFamily: 'inherit'
        });

        input.onchange = (e) => onChange((e.target as HTMLInputElement).value);
        input.onfocus = () => input.style.borderColor = Theme.colors.accent;
        input.onblur = () => input.style.borderColor = Theme.colors.border;

        this.element.appendChild(input);
    }
}

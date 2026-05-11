// ui-lib/forms/Select.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Popover } from '../overlays/Popover';

export interface SelectOption {
    label: string;
    value: string;
}

export interface SelectProps {
    label?: string;
    options: SelectOption[];
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export class Select extends BaseComponent<SelectProps> {
    private button: HTMLButtonElement;
    private popover: Popover | null = null;

    constructor(props: SelectProps) {
        super('div', props);
        this.button = document.createElement('button');
        this.render();
    }

    public render(): void {
        const { label, options, value, placeholder = 'Select...', disabled = false } = this.props;

        this.applyStyles({
            display: 'flex',
            flexDirection: 'column',
            gap: Theme.spacing.xs,
            width: '100%',
            opacity: disabled ? '0.6' : '1',
            pointerEvents: disabled ? 'none' : 'auto'
        });

        if (label) {
            const labelEl = document.createElement('span');
            labelEl.textContent = label;
            labelEl.style.fontSize = Theme.font.sizeBase;
            labelEl.style.color = Theme.colors.textMain;
            this.element.appendChild(labelEl);
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'relative';
        buttonContainer.style.width = '100%';

        const selectedOption = options.find(o => o.value === value);

        this.button.disabled = disabled;
        Object.assign(this.button.style, {
            width: '100%',
            padding: `${Theme.spacing.xs} ${Theme.spacing.sm}`,
            backgroundColor: Theme.colors.bgSecondary,
            border: `1px solid ${Theme.colors.border}`,
            borderRadius: Theme.radius,
            color: Theme.colors.textMain,
            cursor: disabled ? 'default' : 'pointer',
            textAlign: 'left',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: Theme.font.sizeBase
        });

        this.button.innerHTML = `
            <span>${selectedOption ? selectedOption.label : placeholder}</span>
            <i class="fas fa-chevron-down" style="font-size: 10px; opacity: 0.7;"></i>
        `;

        this.button.onclick = () => {
            if (!disabled) this.toggleDropdown();
        };

        buttonContainer.appendChild(this.button);
        this.element.appendChild(buttonContainer);
    }

    private toggleDropdown(): void {
        if (this.popover) {
            this.popover.hide();
            this.popover = null;
            return;
        }

        const items = this.props.options.map(option => {
            const el = document.createElement('div');
            Object.assign(el.style, {
                padding: `${Theme.spacing.xs} ${Theme.spacing.md}`,
                cursor: 'pointer',
                color: Theme.colors.textMain,
                backgroundColor: option.value === this.props.value ? Theme.colors.accent : 'transparent'
            });

            el.onmouseenter = () => {
                if (option.value !== this.props.value) {
                    el.style.backgroundColor = Theme.colors.bgTertiary;
                }
            };
            el.onmouseleave = () => {
                if (option.value !== this.props.value) {
                    el.style.backgroundColor = 'transparent';
                }
            };

            el.onclick = () => {
                this.updateProps({ value: option.value });
                if (this.props.onChange) this.props.onChange(option.value);
                this.popover?.hide();
                this.popover = null;
            };

            el.textContent = option.label;
            return el;
        });

        this.popover = new Popover({
            anchor: this.button,
            content: items,
            placement: 'bottom'
        });
        this.popover.show();
    }
}

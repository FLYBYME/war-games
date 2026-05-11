// ui-lib/forms/TextInput.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface TextInputProps {
    label?: string;
    value?: string;
    placeholder?: string;
    type?: 'text' | 'password' | 'number' | 'email';
    disabled?: boolean;
    fullWidth?: boolean;
    onChange?: (value: string) => void;
    onEnter?: (value: string) => void;
}

export class TextInput extends BaseComponent<TextInputProps> {
    private input: HTMLInputElement;

    constructor(props: TextInputProps) {
        super('div', props);
        this.input = document.createElement('input');
        this.render();
    }

    public render(): void {
        const {
            label,
            value = '',
            placeholder = '',
            type = 'text',
            disabled = false,
            onChange,
            onEnter
        } = this.props;

        this.element.innerHTML = '';
        
        this.applyStyles({
            display: 'flex',
            flexDirection: 'column',
            gap: Theme.spacing.xs,
            width: '100%'
        });

        if (label) {
            const labelEl = document.createElement('span');
            labelEl.textContent = label;
            labelEl.style.fontSize = Theme.font?.sizeBase || '13px';
            labelEl.style.color = Theme.colors.textMain;
            this.element.appendChild(labelEl);
        }

        this.input.type = type;
        this.input.value = value;
        this.input.placeholder = placeholder;
        this.input.disabled = disabled;

        Object.assign(this.input.style, {
            width: '100%',
            boxSizing: 'border-box',
            padding: `${Theme.spacing.xs} ${Theme.spacing.sm}`,
            backgroundColor: Theme.colors.bgTertiary,
            color: Theme.colors.textMain,
            border: `1px solid ${Theme.colors.border}`,
            borderRadius: Theme.radius,
            fontSize: Theme.font?.sizeBase || '13px',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.1s'
        });

        // Focus ring effect for IDEs
        this.input.onfocus = () => { this.input.style.borderColor = Theme.colors.accent; };
        this.input.onblur = () => { this.input.style.borderColor = Theme.colors.border; };

        // Event listeners
        this.input.oninput = (e) => {
            const target = e.target as HTMLInputElement;
            if (onChange) onChange(target.value);
        };

        if (onEnter) {
            this.input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    onEnter((e.target as HTMLInputElement).value);
                }
            };
        }

        this.element.appendChild(this.input);
    }

    // Expose a method to get the value directly if needed outside of the onChange flow
    public getValue(): string {
        return this.input.value;
    }

    public focus(): void {
        this.input.focus();
    }

    public setDisabled(disabled: boolean): void {
        this.input.disabled = disabled;
    }
}
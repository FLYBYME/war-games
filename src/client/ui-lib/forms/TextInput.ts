// ui-lib/forms/TextInput.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface TextInputProps {
    value?: string;
    placeholder?: string;
    type?: 'text' | 'password' | 'number' | 'email';
    disabled?: boolean;
    fullWidth?: boolean;
    onChange?: (value: string) => void;
    onEnter?: (value: string) => void;
}

export class TextInput extends BaseComponent<TextInputProps> {
    constructor(props: TextInputProps) {
        super('input', props);
        this.render();
    }

    public render(): void {
        const {
            value = '',
            placeholder = '',
            type = 'text',
            disabled = false,
            onChange,
            onEnter
        } = this.props;

        const input = this.element as HTMLInputElement;

        input.type = type;
        input.value = value;
        input.placeholder = placeholder;
        input.disabled = disabled;

        this.applyStyles({
            width: '100%',
            boxSizing: 'border-box',
            padding: `${Theme.spacing.xs} ${Theme.spacing.sm}`,
            backgroundColor: Theme.colors.bgTertiary, // slightly lighter/darker than panel background
            color: Theme.colors.textMain,
            border: `1px solid ${Theme.colors.border}`,
            borderRadius: Theme.radius,
            fontSize: Theme.font?.sizeBase || '13px',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.1s'
        });

        // Focus ring effect for IDEs
        input.onfocus = () => this.applyStyles({ border: `1px solid ${Theme.colors.accent}` });
        input.onblur = () => this.applyStyles({ border: `1px solid ${Theme.colors.border}` });

        // Event listeners
        input.oninput = (e) => {
            const target = e.target as HTMLInputElement;
            if (onChange) onChange(target.value);
        };

        if (onEnter) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    onEnter((e.target as HTMLInputElement).value);
                }
            };
        }
    }

    // Expose a method to get the value directly if needed outside of the onChange flow
    public getValue(): string {
        return (this.element as HTMLInputElement).value;
    }

    public focus(): void {
        this.element.focus();
    }

    public setDisabled(disabled: boolean): void {
        (this.element as HTMLInputElement).disabled = disabled;
    }
}
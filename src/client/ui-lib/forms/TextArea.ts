// ui-lib/forms/TextArea.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface TextAreaProps {
    value?: string;
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
    onChange?: (value: string) => void;
}

export class TextArea extends BaseComponent<TextAreaProps> {
    constructor(props: TextAreaProps) {
        super('textarea', props);
        this.render();
    }

    public render(): void {
        const {
            value = '',
            placeholder = '',
            rows = 3,
            disabled = false,
            onChange
        } = this.props;

        const textarea = this.element as HTMLTextAreaElement;

        textarea.value = value;
        textarea.placeholder = placeholder;
        textarea.rows = rows;
        textarea.disabled = disabled;

        this.applyStyles({
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
            transition: 'border-color 0.1s',
            resize: 'vertical',
            minHeight: '60px'
        });

        textarea.onfocus = () => this.applyStyles({ border: `1px solid ${Theme.colors.accent}` });
        textarea.onblur = () => this.applyStyles({ border: `1px solid ${Theme.colors.border}` });

        textarea.oninput = (e) => {
            const target = e.target as HTMLTextAreaElement;
            if (onChange) onChange(target.value);
        };
    }

    public getValue(): string {
        return (this.element as HTMLTextAreaElement).value;
    }
}

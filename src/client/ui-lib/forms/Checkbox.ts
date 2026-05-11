// ui-lib/forms/Checkbox.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Row } from '../layout/Row';
import { Text } from '../typography/Text';

export interface CheckboxProps {
    label: string;
    checked?: boolean;
    disabled?: boolean;
    onChange?: (checked: boolean) => void;
}

export class Checkbox extends BaseComponent<CheckboxProps> {
    private inputElement: HTMLInputElement;

    constructor(props: CheckboxProps) {
        // We use a 'label' element as the root container to make the text clickable
        super('label', props);
        this.inputElement = document.createElement('input');
        this.render();
    }

    public render(): void {
        const { label, checked = false, disabled = false, onChange } = this.props;

        this.applyStyles({
            display: 'flex',
            alignItems: 'center',
            gap: Theme.spacing.sm,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? '0.6' : '1',
            userSelect: 'none'
        });

        this.inputElement.type = 'checkbox';
        this.inputElement.checked = checked;
        this.inputElement.disabled = disabled;

        this.inputElement.style.margin = '0'; // Reset browser margins
        this.inputElement.style.cursor = disabled ? 'not-allowed' : 'pointer';

        this.inputElement.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            if (onChange) onChange(target.checked);
        };

        // Append input and text
        this.appendChildren(
            this.inputElement,
            new Text({ text: label, size: 'base' })
        );
    }

    public isChecked(): boolean {
        return this.inputElement.checked;
    }
}
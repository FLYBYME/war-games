// src/client/ui-lib/forms/ButtonGroup.ts
import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';
import { Button } from './Button';

export interface ButtonGroupProps {
    children: Button[];
    orientation?: 'horizontal' | 'vertical';
    fill?: boolean;
}

export class ButtonGroup extends BaseComponent<ButtonGroupProps> {
    constructor(props: ButtonGroupProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { children, orientation = 'horizontal', fill = false } = this.props;

        this.applyStyles({
            display: 'inline-flex',
            flexDirection: orientation === 'horizontal' ? 'row' : 'column',
            width: fill ? '100%' : 'auto',
            borderRadius: Theme.radius,
            overflow: 'hidden',
            border: `1px solid ${Theme.colors.border}`
        });

        this.element.innerHTML = '';

        children.forEach((button, index) => {
            const btnEl = button.getElement();
            btnEl.style.borderRadius = '0';
            btnEl.style.border = 'none';
            if (fill) btnEl.style.flex = '1';

            if (index > 0) {
                if (orientation === 'horizontal') {
                    btnEl.style.borderLeft = `1px solid ${Theme.colors.border}`;
                } else {
                    btnEl.style.borderTop = `1px solid ${Theme.colors.border}`;
                }
            }

            this.element.appendChild(btnEl);
        });
    }
}

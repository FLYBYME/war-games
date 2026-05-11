// ui-lib/ide/KeybindingLabel.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface KeybindingLabelProps {
    keys: string[]; // e.g. ['Ctrl', 'Shift', 'P']
}

export class KeybindingLabel extends BaseComponent<KeybindingLabelProps> {
    constructor(props: KeybindingLabelProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const { keys } = this.props;

        this.applyStyles({
            display: 'inline-flex',
            gap: '4px',
            alignItems: 'center'
        });

        this.element.innerHTML = '';

        keys.forEach((key, index) => {
            const kbd = document.createElement('kbd');
            Object.assign(kbd.style, {
                padding: '2px 5px',
                fontSize: '11px',
                fontFamily: 'inherit',
                backgroundColor: Theme.colors.bgTertiary,
                border: `1px solid ${Theme.colors.border}`,
                borderRadius: Theme.radius,
                color: Theme.colors.textMain,
                boxShadow: '0 1px 0 rgba(0, 0, 0, 0.2)',
                minWidth: '1.2em',
                textAlign: 'center'
            });
            kbd.textContent = key;
            this.element.appendChild(kbd);

            if (index < keys.length - 1) {
                const plus = document.createElement('span');
                plus.textContent = '+';
                plus.style.fontSize = '10px';
                plus.style.opacity = '0.5';
                this.element.appendChild(plus);
            }
        });
    }
}

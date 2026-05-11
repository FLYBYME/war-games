// ui-lib/forms/Switch.ts

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface SwitchProps {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    label?: string;
}

export class Switch extends BaseComponent<SwitchProps> {
    private track: HTMLDivElement;
    private thumb: HTMLDivElement;

    constructor(props: SwitchProps) {
        super('div', props);
        this.track = document.createElement('div');
        this.thumb = document.createElement('div');
        this.render();
    }

    public render(): void {
        const { checked = false, label } = this.props;

        this.applyStyles({
            display: 'inline-flex',
            alignItems: 'center',
            gap: Theme.spacing.sm,
            cursor: 'pointer',
            userSelect: 'none'
        });

        Object.assign(this.track.style, {
            width: '32px',
            height: '18px',
            backgroundColor: checked ? Theme.colors.accent : Theme.colors.bgTertiary,
            borderRadius: '9px',
            position: 'relative',
            transition: 'background-color 0.2s'
        });

        Object.assign(this.thumb.style, {
            width: '14px',
            height: '14px',
            backgroundColor: '#fff',
            borderRadius: '50%',
            position: 'absolute',
            top: '2px',
            left: checked ? '16px' : '2px',
            transition: 'left 0.2s'
        });

        this.track.innerHTML = '';
        this.track.appendChild(this.thumb);

        this.element.innerHTML = '';
        this.element.appendChild(this.track);

        if (label) {
            const labelEl = document.createElement('span');
            labelEl.textContent = label;
            labelEl.style.fontSize = Theme.font.sizeBase;
            labelEl.style.color = Theme.colors.textMain;
            this.element.appendChild(labelEl);
        }

        this.element.onclick = () => {
            const nextChecked = !this.props.checked;
            this.updateProps({ checked: nextChecked });
            if (this.props.onChange) this.props.onChange(nextChecked);
        };
    }
}

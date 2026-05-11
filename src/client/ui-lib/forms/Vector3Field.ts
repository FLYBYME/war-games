/**
 * Vector3Field — Composite X/Y/Z input for 3D coordinates.
 *
 * Used by the Schema-Driven UI to render Vector3 inputs,
 * and by the Entity Inspector for position/velocity editing.
 */

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface Vector3Value {
    x: number;
    y: number;
    z: number;
}

export interface Vector3FieldProps {
    value?: Vector3Value;
    labels?: { x?: string; y?: string; z?: string };
    onChange?: (value: Vector3Value) => void;
    disabled?: boolean;
}

export class Vector3Field extends BaseComponent<Vector3FieldProps> {
    private xInput: HTMLInputElement | null = null;
    private yInput: HTMLInputElement | null = null;
    private zInput: HTMLInputElement | null = null;

    constructor(props: Vector3FieldProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const {
            value = { x: 0, y: 0, z: 0 },
            labels = {},
            disabled = false,
        } = this.props;

        this.applyStyles({
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
        });

        this.element.innerHTML = '';

        const xLabel = labels.x ?? 'X';
        const yLabel = labels.y ?? 'Y';
        const zLabel = labels.z ?? 'Z';

        this.xInput = this.createAxisInput(xLabel, value.x, '#f44336', disabled);
        this.yInput = this.createAxisInput(yLabel, value.y, '#4caf50', disabled);
        this.zInput = this.createAxisInput(zLabel, value.z, '#2196f3', disabled);

        this.element.appendChild(this.wrapAxis(xLabel, this.xInput, '#f44336'));
        this.element.appendChild(this.wrapAxis(yLabel, this.yInput, '#4caf50'));
        this.element.appendChild(this.wrapAxis(zLabel, this.zInput, '#2196f3'));
    }

    private createAxisInput(
        _label: string,
        value: number,
        _color: string,
        disabled: boolean
    ): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = String(value);
        input.disabled = disabled;
        input.step = '0.1';

        Object.assign(input.style, {
            width: '60px',
            padding: '3px 4px',
            backgroundColor: Theme.colors.bgTertiary,
            color: Theme.colors.textMain,
            border: `1px solid ${Theme.colors.border}`,
            borderRadius: Theme.radius,
            fontSize: '11px',
            fontFamily: 'var(--font-mono, monospace)',
            outline: 'none',
            boxSizing: 'border-box',
        });

        input.addEventListener('focus', () => {
            input.style.borderColor = Theme.colors.accent;
        });
        input.addEventListener('blur', () => {
            input.style.borderColor = Theme.colors.border;
        });
        input.addEventListener('input', () => {
            this.emitChange();
        });

        return input;
    }

    private wrapAxis(label: string, input: HTMLInputElement, color: string): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '2px';

        const labelEl = document.createElement('span');
        Object.assign(labelEl.style, {
            fontSize: '10px',
            fontWeight: '700',
            color,
            width: '12px',
            textAlign: 'center',
        });
        labelEl.textContent = label;

        wrapper.appendChild(labelEl);
        wrapper.appendChild(input);
        return wrapper;
    }

    private emitChange(): void {
        const { onChange } = this.props;
        if (!onChange) return;

        onChange({
            x: Number(this.xInput?.value ?? 0),
            y: Number(this.yInput?.value ?? 0),
            z: Number(this.zInput?.value ?? 0),
        });
    }

    public getValue(): Vector3Value {
        return {
            x: Number(this.xInput?.value ?? 0),
            y: Number(this.yInput?.value ?? 0),
            z: Number(this.zInput?.value ?? 0),
        };
    }
}

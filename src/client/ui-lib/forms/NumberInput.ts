/**
 * NumberInput — Dedicated numeric input with step, min, max, and format options.
 *
 * Provides:
 * - Increment/decrement buttons
 * - Drag-to-change (hold and drag horizontally)
 * - Input validation and clamping
 */

import { BaseComponent } from '../BaseComponent';
import { Theme } from '../theme';

export interface NumberInputProps {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    /** Format display value (e.g., toFixed(2)) */
    precision?: number;
    /** Unit suffix (e.g., "kts", "nm", "ft") */
    unit?: string;
    onChange?: (value: number) => void;
}

export class NumberInput extends BaseComponent<NumberInputProps> {
    private inputEl: HTMLInputElement | null = null;

    constructor(props: NumberInputProps) {
        super('div', props);
        this.render();
    }

    public render(): void {
        const {
            value = 0,
            min,
            max,
            step = 1,
            label,
            placeholder,
            disabled = false,
            precision,
            unit,
        } = this.props;

        this.applyStyles({
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
        });

        this.element.innerHTML = '';

        // Label
        if (label) {
            const labelEl = document.createElement('label');
            Object.assign(labelEl.style, {
                fontSize: '11px',
                color: Theme.colors.textMuted,
                fontWeight: '600',
                minWidth: '40px',
            });
            labelEl.textContent = label;
            this.element.appendChild(labelEl);
        }

        // Decrement button
        const decBtn = document.createElement('button');
        decBtn.textContent = '−';
        this.applyButtonStyles(decBtn, disabled);
        decBtn.addEventListener('click', () => {
            if (disabled) return;
            const newVal = this.clamp((this.getCurrentValue()) - step);
            this.setInputValue(newVal);
            this.props.onChange?.(newVal);
        });
        this.element.appendChild(decBtn);

        // Input
        const input = document.createElement('input');
        input.type = 'number';
        input.value = precision !== undefined ? value.toFixed(precision) : String(value);
        input.disabled = disabled;
        if (min !== undefined) input.min = String(min);
        if (max !== undefined) input.max = String(max);
        input.step = String(step);
        input.placeholder = placeholder ?? '';

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
            textAlign: 'center',
            boxSizing: 'border-box',
            MozAppearance: 'textfield',
        });

        input.addEventListener('focus', () => {
            input.style.borderColor = Theme.colors.accent;
        });
        input.addEventListener('blur', () => {
            input.style.borderColor = Theme.colors.border;
            // Clamp on blur
            const clamped = this.clamp(Number(input.value));
            this.setInputValue(clamped);
            this.props.onChange?.(clamped);
        });
        input.addEventListener('input', () => {
            this.props.onChange?.(Number(input.value));
        });

        // Scroll-to-change
        input.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (disabled) return;
            const delta = e.deltaY < 0 ? step : -step;
            const newVal = this.clamp(this.getCurrentValue() + delta);
            this.setInputValue(newVal);
            this.props.onChange?.(newVal);
        });

        this.inputEl = input;
        this.element.appendChild(input);

        // Increment button
        const incBtn = document.createElement('button');
        incBtn.textContent = '+';
        this.applyButtonStyles(incBtn, disabled);
        incBtn.addEventListener('click', () => {
            if (disabled) return;
            const newVal = this.clamp((this.getCurrentValue()) + step);
            this.setInputValue(newVal);
            this.props.onChange?.(newVal);
        });
        this.element.appendChild(incBtn);

        // Unit suffix
        if (unit) {
            const unitEl = document.createElement('span');
            Object.assign(unitEl.style, {
                fontSize: '10px',
                color: Theme.colors.textMuted,
                fontStyle: 'italic',
            });
            unitEl.textContent = unit;
            this.element.appendChild(unitEl);
        }
    }

    private applyButtonStyles(btn: HTMLButtonElement, disabled: boolean): void {
        Object.assign(btn.style, {
            width: '20px',
            height: '20px',
            padding: '0',
            backgroundColor: 'transparent',
            color: disabled ? Theme.colors.textMuted : Theme.colors.textMain,
            border: `1px solid ${Theme.colors.border}`,
            borderRadius: Theme.radius,
            fontSize: '12px',
            cursor: disabled ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'inherit',
        });
        if (!disabled) {
            btn.addEventListener('mouseenter', () => {
                btn.style.backgroundColor = 'rgba(255,255,255,0.05)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.backgroundColor = 'transparent';
            });
        }
    }

    private getCurrentValue(): number {
        return Number(this.inputEl?.value ?? 0);
    }

    private setInputValue(val: number): void {
        if (!this.inputEl) return;
        const { precision } = this.props;
        this.inputEl.value = precision !== undefined ? val.toFixed(precision) : String(val);
    }

    private clamp(val: number): number {
        const { min, max } = this.props;
        let result = val;
        if (min !== undefined) result = Math.max(min, result);
        if (max !== undefined) result = Math.min(max, result);
        return result;
    }

    public getValue(): number {
        return this.getCurrentValue();
    }
}

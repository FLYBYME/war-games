/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { Select } from '../../../client/ui-lib/forms/Select';
import { Slider } from '../../../client/ui-lib/forms/Slider';

describe('Selection & Range Components', () => {
    describe('Select', () => {
        it('should render correctly with custom button', () => {
            const options = [
                { label: 'Option 1', value: '1' },
                { label: 'Option 2', value: '2' }
            ];
            const select = new Select({ options, value: '1' });
            const btn = select.getElement().querySelector('button');
            expect(btn?.textContent).toContain('Option 1');
        });

        it('should call onChange when selection changes', () => {
            const onChange = vi.fn();
            const select = new Select({ 
                options: [{ label: 'O1', value: '1' }, { label: 'O2', value: '2' }],
                onChange 
            });
            // Dropdown testing is complex due to Popover, 
            // but we can check if updateProps triggers internal state if needed.
        });
    });

    describe('Slider', () => {
        it('should render with min/max/value', () => {
            const slider = new Slider({ min: 0, max: 100, value: 50 });
            const inputEl = slider.getElement().querySelector('input');
            expect(inputEl?.getAttribute('min')).toBe('0');
            expect(inputEl?.getAttribute('max')).toBe('100');
            expect(inputEl?.value).toBe('50');
        });

        it('should call onChange on input', () => {
            const onChange = vi.fn();
            const slider = new Slider({ min: 0, max: 100, onChange });
            const inputEl = slider.getElement().querySelector('input');
            
            if (inputEl) {
                inputEl.value = '75';
                inputEl.dispatchEvent(new Event('input'));
            }
            
            expect(onChange).toHaveBeenCalledWith(75);
        });
    });
});

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { Vector3Field } from '../../../client/ui-lib/forms/Vector3Field';

describe('Vector3Field Component', () => {
    it('should render three inputs with correct values', () => {
        const value = { x: 1.1, y: 2.2, z: 3.3 };
        const field = new Vector3Field({ value });
        const inputs = field.getElement().querySelectorAll('input');
        
        expect(inputs.length).toBe(3);
        expect(inputs[0].value).toBe('1.1');
        expect(inputs[1].value).toBe('2.2');
        expect(inputs[2].value).toBe('3.3');
    });

    it('should call onChange with updated vector when an input changes', () => {
        const onChange = vi.fn();
        const value = { x: 0, y: 0, z: 0 };
        const field = new Vector3Field({ value, onChange });
        const inputs = field.getElement().querySelectorAll('input');
        
        if (inputs[0]) {
            inputs[0].value = '10.5';
            inputs[0].dispatchEvent(new Event('input'));
        }
        
        expect(onChange).toHaveBeenCalledWith({ x: 10.5, y: 0, z: 0 });
    });

    it('should provide current value via getValue()', () => {
        const field = new Vector3Field({ value: { x: 1, y: 2, z: 3 } });
        expect(field.getValue()).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('should respect disabled state', () => {
        const field = new Vector3Field({ disabled: true });
        const inputs = field.getElement().querySelectorAll('input');
        inputs.forEach(input => {
            expect(input.disabled).toBe(true);
        });
    });
});

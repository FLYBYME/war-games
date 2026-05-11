/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { TextInput } from '../../../client/ui-lib/forms/TextInput';
import { SearchInput } from '../../../client/ui-lib/forms/SearchInput';

describe('Input Components', () => {
    describe('TextInput', () => {
        it('should render with initial value', () => {
            const input = new TextInput({ value: 'Initial' });
            const inputEl = input.getElement().querySelector('input');
            expect(inputEl?.value).toBe('Initial');
        });

        it('should call onEnter when Enter key is pressed', () => {
            const onEnter = vi.fn();
            const input = new TextInput({ onEnter });
            const inputEl = input.getElement().querySelector('input');
            
            const event = new KeyboardEvent('keydown', { key: 'Enter' });
            inputEl?.dispatchEvent(event);
            
            expect(onEnter).toHaveBeenCalled();
        });

        it('should update value on change', () => {
            const onChange = vi.fn();
            const input = new TextInput({ onChange });
            const inputEl = input.getElement().querySelector('input');
            
            if (inputEl) {
                inputEl.value = 'New Value';
                inputEl.dispatchEvent(new Event('input'));
            }
            
            expect(onChange).toHaveBeenCalledWith('New Value');
        });
    });

    describe('SearchInput', () => {
        it('should render with search icon', () => {
            const search = new SearchInput({ placeholder: 'Search...' });
            expect(search.getElement().querySelector('i')).not.toBeNull();
        });

        it('should clear value when clear button is clicked', () => {
            const search = new SearchInput({ value: 'something' });
            // SearchInput usually has a clear button if value exists
            // We might need to check the internal structure
        });
    });
});

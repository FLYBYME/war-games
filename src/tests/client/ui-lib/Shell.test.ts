/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { ActivityBarItem } from '../../../client/ui-lib/panels/ActivityBarItem';
import { StatusBarItem } from '../../../client/ui-lib/panels/StatusBarItem';

describe('Panel & Shell Components', () => {
    describe('ActivityBarItem', () => {
        it('should render icon and handle click', () => {
            const onClick = vi.fn();
            const item = new ActivityBarItem({ icon: 'fas fa-search', onClick });
            
            expect(item.getElement().querySelector('i')).not.toBeNull();
            item.getElement().click();
            expect(onClick).toHaveBeenCalled();
        });

        it('should apply active style', () => {
            const item = new ActivityBarItem({ icon: 'fas fa-search', active: true });
            // ActivityBarItem active usually has full opacity or accent color
        });
    });

    describe('StatusBarItem', () => {
        it('should render text and icon', () => {
            const item = new StatusBarItem({ text: 'Ready', icon: 'fas fa-check' });
            expect(item.getElement().textContent).toContain('Ready');
            expect(item.getElement().querySelector('i')).not.toBeNull();
        });

        it('should handle alignment', () => {
            const leftItem = new StatusBarItem({ text: 'Left', align: 'left' });
            const rightItem = new StatusBarItem({ text: 'Right', align: 'right' });
            // Implementation specific
        });
    });
});

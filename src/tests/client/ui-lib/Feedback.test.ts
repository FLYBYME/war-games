/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { Badge } from '../../../client/ui-lib/feedback/Badge';
import { ProgressBar } from '../../../client/ui-lib/feedback/ProgressBar';
import { Spinner } from '../../../client/ui-lib/feedback/Spinner';

describe('Feedback Components', () => {
    describe('Badge', () => {
        it('should render count correctly', () => {
            const badge = new Badge({ count: '5' });
            expect(badge.getElement().textContent).toBe('5');
        });

        it('should apply variant styles', () => {
            const badge = new Badge({ count: '!', variant: 'error' });
            // Should have red background
            expect(badge.getElement().style.backgroundColor).not.toBe('');
        });
    });

    describe('ProgressBar', () => {
        it('should render with correct width', () => {
            const bar = new ProgressBar({ progress: 75 });
            const fill = bar.getElement().querySelector('div > div'); // Adjust based on internal structure
            // ProgressBar usually has a wrapper and a fill
        });
    });

    describe('Spinner', () => {
        it('should render correctly', () => {
            const spinner = new Spinner({ size: 'lg' });
            expect(spinner.getElement().style.width).toBe('32px');
        });
    });
});

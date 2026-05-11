/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../../../client/ui-lib/forms/Button';

describe('Button Component', () => {
    it('should render the label correctly', () => {
        const btn = new Button({ label: 'Test Button' });
        expect(btn.getElement().textContent).toBe('Test Button');
    });

    it('should render the icon if provided', () => {
        const btn = new Button({ icon: 'fas fa-play' });
        const icon = btn.getElement().querySelector('i');
        expect(icon).not.toBeNull();
        expect(icon?.className).toBe('fas fa-play');
    });

    it('should call onClick when clicked', () => {
        const onClick = vi.fn();
        const btn = new Button({ label: 'Click Me', onClick });
        
        btn.getElement().click();
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
        const onClick = vi.fn();
        const btn = new Button({ label: 'Disabled', onClick, disabled: true });
        
        btn.getElement().click();
        expect(onClick).not.toHaveBeenCalled();
    });

    it('should apply primary variant styles', () => {
        const btn = new Button({ label: 'Primary', variant: 'primary' });
        // Theme.colors.accent is usually #007acc or similar
        // In JSDOM, background colors might be returned as rgb
        expect(btn.getElement().style.backgroundColor).not.toBe('');
    });
});

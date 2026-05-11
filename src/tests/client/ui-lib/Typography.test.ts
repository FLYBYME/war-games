/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { Text } from '../../../client/ui-lib/typography/Text';
import { Heading } from '../../../client/ui-lib/typography/Heading';

describe('Typography Components', () => {
    describe('Text', () => {
        it('should render content correctly', () => {
            const txt = new Text({ text: 'Hello World' });
            expect(txt.getElement().textContent).toBe('Hello World');
        });

        it('should apply variant styles', () => {
            const txt = new Text({ text: 'Muted', variant: 'muted' });
            // Should have some opacity or grey color
            expect(txt.getElement().style.color).not.toBe('');
        });

        it('should support monospace', () => {
            const txt = new Text({ text: 'Code', monospace: true });
            expect(txt.getElement().style.fontFamily).toContain('mono');
        });
    });

    describe('Heading', () => {
        it('should render the correct level tag', () => {
            const h1 = new Heading({ text: 'Title', level: 1 });
            expect(h1.getElement().tagName).toBe('H1');
            
            const h3 = new Heading({ text: 'Sub', level: 3 });
            expect(h3.getElement().tagName).toBe('H3');
        });

        it('should align text', () => {
            const h = new Heading({ text: 'Center', align: 'center' });
            expect(h.getElement().style.textAlign).toBe('center');
        });
    });
});

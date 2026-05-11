/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { Row } from '../../../client/ui-lib/layout/Row';
import { Column } from '../../../client/ui-lib/layout/Column';
import { Text } from '../../../client/ui-lib/typography/Text';

describe('Layout Components', () => {
    describe('Row', () => {
        it('should render with flex-direction row', () => {
            const row = new Row({});
            expect(row.getElement().style.flexDirection).toBe('row');
        });

        it('should align items and justify content', () => {
            const row = new Row({ align: 'center', justify: 'space-between' });
            expect(row.getElement().style.alignItems).toBe('center');
            expect(row.getElement().style.justifyContent).toBe('space-between');
        });

        it('should apply gap', () => {
            const row = new Row({ gap: 'md' });
            expect(row.getElement().style.gap).not.toBe('');
        });
    });

    describe('Column', () => {
        it('should render with flex-direction column', () => {
            const col = new Column({});
            expect(col.getElement().style.flexDirection).toBe('column');
        });

        it('should fill parent if specified', () => {
            const col = new Column({ fill: true });
            expect(col.getElement().style.height).toBe('100%');
            expect(col.getElement().style.width).toBe('100%');
        });

        it('should manage children', () => {
            const col = new Column({});
            const child = new Text({ text: 'child' });
            col.appendChildren(child);
            expect(col.getElement().contains(child.getElement())).toBe(true);
        });
    });
});

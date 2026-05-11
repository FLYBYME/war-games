/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { BaseComponent } from '../../../client/ui-lib/BaseComponent';

class TestComponent extends BaseComponent<{ label: string }> {
    constructor(props: { label: string }) {
        super('div', props);
        this.render();
    }
    render() {
        this.element.textContent = this.props.label;
    }
}

describe('BaseComponent', () => {
    it('should create an element of the specified tag', () => {
        const comp = new TestComponent({ label: 'test' });
        expect(comp.getElement().tagName).toBe('DIV');
    });

    it('should apply styles correctly', () => {
        const comp = new TestComponent({ label: 'test' });
        comp.applyStyles({ color: 'red', fontSize: '20px' });
        expect(comp.getElement().style.color).toBe('red');
        expect(comp.getElement().style.fontSize).toBe('20px');
    });

    it('should append children correctly', () => {
        const parent = new TestComponent({ label: 'parent' });
        const child1 = new TestComponent({ label: 'child1' });
        const child2 = new TestComponent({ label: 'child2' });
        
        parent.appendChildren(child1, child2);
        expect(parent.getElement().children.length).toBe(2);
        expect(parent.getElement().children[0]).toBe(child1.getElement());
    });

    it('should mount to a container', () => {
        const container = document.createElement('div');
        const comp = new TestComponent({ label: 'test' });
        comp.mount(container);
        expect(container.contains(comp.getElement())).toBe(true);
    });

    it('should dispose correctly', () => {
        const comp = new TestComponent({ label: 'test' });
        const el = comp.getElement();
        const parent = document.createElement('div');
        comp.mount(parent);
        
        comp.dispose();
        expect(parent.contains(el)).toBe(false);
    });
});

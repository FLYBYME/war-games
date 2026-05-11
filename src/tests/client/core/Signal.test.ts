import { describe, it, expect, vi } from 'vitest';
import { Signal } from '../../../client/core/Signal';

describe('Signal Primitive', () => {
    it('should hold initial value', () => {
        const s = new Signal(10);
        expect(s.get()).toBe(10);
    });

    it('should update value and notify listeners', () => {
        const s = new Signal(10);
        const listener = vi.fn();
        s.subscribe(listener);
        
        // Initial notification
        expect(listener).toHaveBeenCalledWith(10);
        
        s.set(20);
        expect(s.get()).toBe(20);
        expect(listener).toHaveBeenCalledWith(20);
    });

    it('should not notify if value is identical', () => {
        const s = new Signal(10);
        const listener = vi.fn();
        s.subscribe(listener);
        
        listener.mockClear();
        s.set(10);
        expect(listener).not.toHaveBeenCalled();
    });

    it('should allow unsubscription', () => {
        const s = new Signal(10);
        const listener = vi.fn();
        const unsub = s.subscribe(listener);
        
        unsub();
        s.set(20);
        expect(listener).toHaveBeenCalledTimes(1); // Only the initial call
    });

    it('should update value via update function', () => {
        const s = new Signal(10);
        s.update(v => v + 5);
        expect(s.get()).toBe(15);
    });
});

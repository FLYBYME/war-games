import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SelectionService, SelectionEvents } from '../../../client/core/services/SelectionService';

describe('SelectionService', () => {
    let mockEmitter: any;
    let service: SelectionService;

    beforeEach(() => {
        mockEmitter = {
            emit: vi.fn()
        };
        service = new SelectionService();
        service.setEmitter(mockEmitter);
    });

    it('should initialize empty', () => {
        expect(Array.from(service.selectedIds.get())).toEqual([]);
        expect(service.primaryId.get()).toBeNull();
    });

    it('should select a single entity', () => {
        service.select('e1');
        expect(Array.from(service.selectedIds.get())).toEqual(['e1']);
        expect(service.primaryId.get()).toBe('e1');
        expect(mockEmitter.emit).toHaveBeenCalledWith(SelectionEvents.SELECTION_CHANGED, { ids: ['e1'] });
    });

    it('should toggle selection', () => {
        service.select('e1');
        service.toggle('e1');
        expect(Array.from(service.selectedIds.get())).toEqual([]);
        
        service.toggle('e2');
        expect(Array.from(service.selectedIds.get())).toEqual(['e2']);
    });

    it('should clear selection', () => {
        service.select('e1');
        service.clear();
        expect(Array.from(service.selectedIds.get())).toEqual([]);
        expect(service.primaryId.get()).toBeNull();
    });
});

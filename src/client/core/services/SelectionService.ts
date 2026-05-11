/**
 * SelectionService — Tracks which entities are currently selected.
 *
 * Used by the Map (to highlight), the Entity Inspector (to populate),
 * and the Schema-Driven UI (to auto-fill entityId fields).
 */

import { Signal } from '../Signal';

export const SelectionEvents = {
    SELECTION_CHANGED: 'selection:changed',
} as const;

export class SelectionService {
    /** The set of currently selected entity IDs. */
    public readonly selectedIds = new Signal<ReadonlySet<string>>(new Set());

    /** Convenience: the single selected entity (null if 0 or 2+ selected). */
    public readonly primaryId = new Signal<string | null>(null);

    private emitter: { emit: (event: string, data?: unknown) => void } | null = null;

    public setEmitter(emitter: { emit: (event: string, data?: unknown) => void }): void {
        this.emitter = emitter;
    }

    /**
     * Replace the selection with exactly one entity.
     */
    public select(entityId: string): void {
        this.selectedIds.set(new Set([entityId]));
        this.primaryId.set(entityId);
        this.emitter?.emit(SelectionEvents.SELECTION_CHANGED, { ids: [entityId] });
    }

    /**
     * Toggle an entity in the selection (for multi-select with Ctrl/Shift).
     */
    public toggle(entityId: string): void {
        const current = new Set(this.selectedIds.get());
        if (current.has(entityId)) {
            current.delete(entityId);
        } else {
            current.add(entityId);
        }
        this.selectedIds.set(current);

        // Primary is the single selection, or null if multi/empty
        if (current.size === 1) {
            const [only] = current;
            this.primaryId.set(only);
        } else {
            this.primaryId.set(null);
        }
        this.emitter?.emit(SelectionEvents.SELECTION_CHANGED, { ids: Array.from(current) });
    }

    /**
     * Clear all selections.
     */
    public clear(): void {
        this.selectedIds.set(new Set());
        this.primaryId.set(null);
        this.emitter?.emit(SelectionEvents.SELECTION_CHANGED, { ids: [] });
    }

    /**
     * Check if a specific entity is selected.
     */
    public isSelected(entityId: string): boolean {
        return this.selectedIds.get().has(entityId);
    }
}

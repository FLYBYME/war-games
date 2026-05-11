import { Container, Rectangle } from 'pixi.js';
import { MapViewState } from './MapState';

/**
 * MapLayer: Base interface for all tactical map layers.
 */
export interface MapLayer {
    readonly id: string;
    readonly container: Container;
    
    /**
     * update: Called on every ViewState change or viewport scale change.
     * @param state The current authoritative map view state
     * @param viewScale The current viewport scale (1.0 = 100%)
     * @param visibleWorldBounds The current visible world coordinates
     */
    update(state: MapViewState, viewScale: number, visibleWorldBounds?: Rectangle): void;
    
    /**
     * init: Called once when the layer is added to the renderer.
     * Use for asynchronous loading.
     */
    init?(): Promise<void>;
    
    /**
     * destroy: Called when the renderer is destroyed or the layer is removed.
     */
    destroy?(): void;
}

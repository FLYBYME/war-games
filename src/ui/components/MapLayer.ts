import { Container } from 'pixi.js';
import { ViewState } from '../framework/UIStore';

/**
 * MapLayer: Interface for all tactical map layers.
 * Implement this to create a new toggleable layer (radar cones, sonar CZ, datalinks, etc.)
 * Then register it in TacticalMap via registerLayer().
 */
export interface MapLayer {
    /** Unique layer ID matching a LAYER_DEFS entry */
    readonly id: string;
    /** PixiJS container holding all graphics for this layer */
    readonly container: Container;
    /** Called every frame with the latest view state + current view scale */
    update(state: ViewState, viewScale: number): void;
    /** Optional cleanup */
    destroy?(): void;
}

import { Signal } from '../../core/Signal';

/**
 * MapViewState: Minimal interface for the map's view of the simulation.
 */
export interface MapViewState {
    origin: { lat: number; lon: number } | null;
    units: any[];
    tracks: any[];
    currentTick: number;
    timestamp: number;
    mapData?: any;
}

/**
 * MapState: Localized reactive state for the Map Extension.
 * Replaces the bloated UIStore.
 */
export class MapState {
    // Reactive properties
    public viewState = new Signal<MapViewState>({
        origin: null,
        units: [],
        tracks: [],
        currentTick: 0,
        timestamp: 0
    });

    public selectedEntityId = new Signal<string | null>(null);
    public hoveredEntityId = new Signal<string | null>(null);
    
    private layerVisibility = new Map<string, Signal<boolean>>();

    public getLayerVisibility(layerId: string): Signal<boolean> {
        let sig = this.layerVisibility.get(layerId);
        if (!sig) {
            sig = new Signal<boolean>(true);
            this.layerVisibility.set(layerId, sig);
        }
        return sig;
    }

    public setLayerVisibility(layerId: string, visible: boolean): void {
        this.getLayerVisibility(layerId).set(visible);
    }
}

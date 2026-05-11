import { MapLayer } from './MapLayer';
import { Signal } from '../../core/Signal';

export interface LayerMetadata {
    id: string;
    label: string;
    group: string;
    defaultOn: boolean;
    description?: string;
}

/**
 * LayerRegistry: Manages registration and discovery of map layers.
 */
export class LayerRegistry {
    private layers = new Map<string, { layer: MapLayer, metadata: LayerMetadata }>();
    public availableLayers = new Signal<LayerMetadata[]>([]);

    constructor() {}

    public register(layer: MapLayer, metadata: LayerMetadata) {
        this.layers.set(layer.id, { layer, metadata });
        this.updateAvailableLayers();
    }

    public unregister(id: string) {
        if (this.layers.delete(id)) {
            this.updateAvailableLayers();
        }
    }

    public getLayer(id: string): MapLayer | undefined {
        return this.layers.get(id)?.layer;
    }

    public getAllLayers(): MapLayer[] {
        return Array.from(this.layers.values()).map(l => l.layer);
    }

    private updateAvailableLayers() {
        const metas = Array.from(this.layers.values()).map(l => l.metadata);
        this.availableLayers.set(metas);
    }
}

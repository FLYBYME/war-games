import { MapLayer } from './MapLayer';
import { Signal } from '../Signal';
import { logger } from '../Logger';

export interface LayerMetadata {
    id: string;
    label: string;
    group: string;
    defaultOn: boolean;
    description?: string;
}

export class LayerRegistry {
    private static instance: LayerRegistry;
    private layers = new Map<string, { layer: MapLayer, metadata: LayerMetadata }>();
    public availableLayers = new Signal<LayerMetadata[]>([]);

    private constructor() {}

    public static getInstance(): LayerRegistry {
        if (!LayerRegistry.instance) LayerRegistry.instance = new LayerRegistry();
        return LayerRegistry.instance;
    }

    register(layer: MapLayer, metadata: LayerMetadata) {
        this.layers.set(layer.id, { layer, metadata });
        this.updateAvailableLayers();
        logger.debug(`Layer Registry: Registered ${layer.id} (${metadata.label})`);
    }

    unregister(id: string) {
        if (this.layers.delete(id)) {
            this.updateAvailableLayers();
        }
    }

    getLayer(id: string): MapLayer | undefined {
        return this.layers.get(id)?.layer;
    }

    getAllLayers(): MapLayer[] {
        return Array.from(this.layers.values()).map(l => l.layer);
    }

    private updateAvailableLayers() {
        const metas = Array.from(this.layers.values()).map(l => l.metadata);
        this.availableLayers.set(metas);
    }
}

export const layerRegistry = LayerRegistry.getInstance();

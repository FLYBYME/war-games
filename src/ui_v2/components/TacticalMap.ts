import { Component } from '../framework/Component';
import { MapRenderer } from '../framework/MapRenderer';
import { GridLayer } from '../framework/map/layers/GridLayer';
import { UnitsLayer } from '../framework/map/layers/UnitsLayer';
import { BordersLayer } from '../framework/map/layers/BordersLayer';
import { BathymetryLayer } from '../framework/map/layers/BathymetryLayer';
import { RegionalTerrainLayer } from '../framework/map/layers/RegionalTerrainLayer';
import { RasterBordersLayer } from '../framework/map/layers/RasterBordersLayer';
import { DatalinkLayer } from '../framework/map/layers/DatalinkLayer';
import { CoverageLayer } from '../framework/map/layers/CoverageLayer';
import { UnitLabelsLayer } from '../framework/map/layers/UnitLabelsLayer';
import { TracksLayer } from '../framework/map/layers/TracksLayer';
import { TacticalGraphicsLayer } from '../framework/map/layers/TacticalGraphicsLayer';
import { worldToLatLon } from '../framework/map/CoordUtils';
import { layerRegistry } from '../framework/map/LayerRegistry';
import { mapDataPipeline } from '../framework/map/MapDataPipeline';
import { UIStore } from '../framework/UIStore';

/**
 * TacticalMap: The PixiJS-based tactical display.
 */
export class TacticalMap extends Component {
    private renderer: MapRenderer;
    private coordsEl!: HTMLElement;

    constructor() {
        super('div', 'tactical-map', 'tactical-map');
        this.renderer = new MapRenderer();
    }

    protected styles(): string {
        return `
            .tactical-map {
                width: 100%;
                height: 100%;
                background: #0a0a0a;
                position: relative;
                overflow: hidden;
            }

            .map-coords {
                position: absolute;
                bottom: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.7);
                color: #00d1ff;
                padding: 4px 8px;
                font-family: monospace;
                font-size: 12px;
                border-radius: 4px;
                pointer-events: none;
                z-index: 10;
                border: 1px solid rgba(0, 209, 255, 0.3);
            }
        `;
    }

    protected render(): void {
        this.coordsEl = this.el('div', 'map-coords', '0.0000°, 0.0000°');
        this.element.appendChild(this.coordsEl);
    }

    protected async onMount() {
        await this.renderer.init(this.element);

        // Register layers via Registry (Renderer will automatically pick them up)
        const terrain = new RegionalTerrainLayer();
        await terrain.init();
        layerRegistry.register(terrain, { id: 'terrain', label: 'Terrain', group: 'environment', defaultOn: true });

        const rasterBorders = new RasterBordersLayer();
        await rasterBorders.init();
        layerRegistry.register(rasterBorders, { id: 'bordersRaster', label: 'Border Overlay', group: 'reference', defaultOn: false });

        layerRegistry.register(new GridLayer(), { id: 'grid', label: 'Grid', group: 'reference', defaultOn: false });
        layerRegistry.register(new BathymetryLayer(), { id: 'bathymetry', label: 'Bathymetry', group: 'environment', defaultOn: false });
        layerRegistry.register(new BordersLayer(), { id: 'borders', label: 'Borders', group: 'reference', defaultOn: false });
        layerRegistry.register(new UnitsLayer(), { id: 'units', label: 'Units', group: 'reference', defaultOn: true });
        layerRegistry.register(new DatalinkLayer(), { id: 'datalink', label: 'Datalink', group: 'tactical', defaultOn: true });
        layerRegistry.register(new CoverageLayer(), { id: 'coverage', label: 'Coverage Zones', group: 'tactical', defaultOn: true });
        layerRegistry.register(new UnitLabelsLayer(), { id: 'labels', label: 'Unit Labels', group: 'tactical', defaultOn: true });
        layerRegistry.register(new TracksLayer(), { id: 'tracks', label: 'Sensor Tracks', group: 'tactical', defaultOn: true });
        layerRegistry.register(new TacticalGraphicsLayer(), { id: 'tactical', label: 'Tactical Graphics', group: 'tactical', defaultOn: true });

        this.setupInteraction();
    }

    private setupInteraction() {
        const canvas = this.element.querySelector('canvas');
        if (!canvas) return;

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const worldPos = this.renderer.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

            const vs = UIStore.viewState.get();
            const origin = vs?.origin || { lat: 0, lon: 0 };

            const lla = worldToLatLon(worldPos.x, worldPos.y, origin as { lat: number, lon: number });

            const height = mapDataPipeline.getElevationSync(lla.lat, lla.lon);
            const heightStr = height !== null ? ` | ${height.toFixed(0)}m` : '';

            this.coordsEl.textContent = `${lla.lat.toFixed(4)}°, ${lla.lon.toFixed(4)}°${heightStr}`;
        });
    }

    protected onUnmount() {
        this.renderer.destroy();
        // Unregister layers if needed, or just keep them for next mount
    }
}

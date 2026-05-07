import { Component } from '../../framework/Component';
import { UIStore } from '../../framework/UIStore';
import { MapEngine } from '../../framework/MapEngine';
import { GridLayer, UnitsLayer, TracksLayer, LabelsLayer, DatalinkLayer } from '../../components/MapLayers';

/**
 * TacticalMap: The Primary Simulation Viewport.
 * High-performance WebGL/Canvas renderer for tactical entities.
 */
export class TacticalMap extends Component {
    private engine!: MapEngine;

    constructor() {
        super('div', 'tactical-map');
    }

    protected render(): void {
        this.element.innerHTML = `<canvas id="tactical-canvas"></canvas>`;
    }

    onMount(): void {
        const canvas = this.element.querySelector('#tactical-canvas') as HTMLCanvasElement;
        this.engine = new MapEngine();

        // Standard Layers
        // Layers are automatically picked up by layer registry.
        // this.engine.addLayer(...) is no longer needed in TacticalMap if using MapEngine v2
        
        // Actually MapEngine.init is called instead of start()
        this.engine.init(canvas).then(() => {
             console.log("Map engine init complete");
        });

        // The ViewState subscription is handled inside MapEngine via UIStore.

    }

    onUnmount(): void {
        this.engine.destroy();
    }
}

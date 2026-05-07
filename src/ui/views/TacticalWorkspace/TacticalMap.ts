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
        this.engine = new MapEngine(canvas);

        // Standard Layers
        this.engine.addLayer(new GridLayer());
        this.engine.addLayer(new UnitsLayer());
        this.engine.addLayer(new TracksLayer());
        this.engine.addLayer(new LabelsLayer());
        this.engine.addLayer(new DatalinkLayer());

        this.engine.start();

        this.subscribe(UIStore.viewState, (vs) => {
            if (vs) this.engine.update(vs);
        });
    }

    onUnmount(): void {
        this.engine.stop();
    }
}

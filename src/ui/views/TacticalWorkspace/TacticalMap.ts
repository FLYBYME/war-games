import { sdkClient } from '../../framework/Client.js';
import { Component } from '../../framework/Component';
import { UIStore, ViewState } from '../../framework/UIStore';
import { logger } from '../../framework/Logger';
import { Application, Container } from 'pixi.js';
import { MapLayer } from '../../components/MapLayer';
import { GridLayer, UnitsLayer, TracksLayer, LabelsLayer, VelocityVectorsLayer, RadarRingsLayer, EngageTethersLayer, WEZLayer, DatalinkLayer } from '../../components/MapLayers';
import { TerrainLayer, LOSShadingLayer, EWStrobesLayer, ReferencePointsLayer, SonobuoyPatternLayer, DepthContoursLayer, ThreatEnvelopeLayer, WeaponTracksLayer, SensorArcsLayer, COPTracksLayer, SonarCZLayer, DetectionCEPLayer, ESMBearingsLayer, BordersLayer, WeatherOverlayLayer, ThermalLayersOverlay, MissionAreaLayer } from '../../components/AdvancedMapLayers';

export class TacticalMap extends Component {
    private app!: Application;
    private worldContainer!: Container;
    private coordsEl!: HTMLElement;
    private layers = new Map<string, MapLayer>();

    private isDragging = false;
    private lastDragPos = { x: 0, y: 0 };
    private viewScale = 1;
    private viewOffset = { x: 0, y: 0 };

    constructor() { super('div', 'viewport-map'); }

    protected styles() {
        return `
        .viewport-map { position:relative; overflow:hidden; }
        .viewport-map canvas { display:block; width:100%; height:100%; }
        .map-coords { position:absolute; bottom:var(--sp-2); right:var(--sp-2); z-index:10; font-family:var(--font-mono); font-size:var(--text-xs); color:var(--text-muted); background:rgba(6,10,18,0.85); padding:2px var(--sp-2); border-radius:var(--radius-sm); pointer-events:none; }
        `;
    }

    protected render() {
        this.coordsEl = this.el('div', 'map-coords', '0.0000°, 0.0000°');
        this.element.appendChild(this.coordsEl);
    }

    protected async onMount() {
        this.app = new Application();
        await this.app.init({ resizeTo: this.element, background: 0x060a12, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
        (window as any).PIXI_APP = this.app;
        this.element.insertBefore(this.app.canvas as HTMLCanvasElement, this.element.firstChild);

        this.worldContainer = new Container();
        this.app.stage.addChild(this.worldContainer);
        this.viewOffset.x = this.app.screen.width / 2;
        this.viewOffset.y = this.app.screen.height / 2;
        this.applyTransform();

        // Register layers bottom-to-top render order
        this.registerLayer(new TerrainLayer());
        this.registerLayer(new GridLayer());
        this.registerLayer(new UnitsLayer());
        this.registerLayer(new TracksLayer());
        // this.registerLayer(new DepthContoursLayer());
        // this.registerLayer(new BordersLayer());
        // this.registerLayer(new MissionAreaLayer());
        // this.registerLayer(new WeatherOverlayLayer());
        // this.registerLayer(new ThermalLayersOverlay());
        // this.registerLayer(new LOSShadingLayer());
        // this.registerLayer(new SonarCZLayer());
        // this.registerLayer(new RadarRingsLayer());
        // this.registerLayer(new SensorArcsLayer());
        // this.registerLayer(new WEZLayer());
        // this.registerLayer(new ThreatEnvelopeLayer());
        // this.registerLayer(new DatalinkLayer());
        // this.registerLayer(new EngageTethersLayer());
        // this.registerLayer(new WeaponTracksLayer());
        // this.registerLayer(new EWStrobesLayer());
        // this.registerLayer(new ESMBearingsLayer());
        // this.registerLayer(new DetectionCEPLayer());
        // this.registerLayer(new COPTracksLayer());
        // this.registerLayer(new SonobuoyPatternLayer());
        // this.registerLayer(new ReferencePointsLayer());
        // this.registerLayer(new VelocityVectorsLayer());
        // this.registerLayer(new LabelsLayer());

        this.setupInteraction();

        this.subscribe(UIStore.viewState, vs => { if (vs) this.updateAllLayers(vs); });
    }

    public registerLayer(layer: MapLayer) {
        this.layers.set(layer.id, layer);
        this.worldContainer.addChild(layer.container);
        logger.debug(`Layer registered: ${layer.id}`);
        const signal = UIStore.getLayerSignal(layer.id);
        this.subscribe(signal, visible => {
            layer.container.visible = visible;
            logger.info(`Layer visibility toggled`, { id: layer.id, visible });
        });
    }

    public getLayer<T extends MapLayer>(id: string): T | undefined {
        return this.layers.get(id) as T | undefined;
    }

    private updateAllLayers(state: ViewState) {
        for (const layer of this.layers.values()) {
            if (layer.container.visible) layer.update(state, this.viewScale);
        }
    }

    private setupInteraction() {
        const canvas = this.app.canvas as HTMLCanvasElement;
        canvas.style.cursor = 'crosshair';

        let startPos = { x: 0, y: 0 };

        canvas.addEventListener('pointerdown', (e: PointerEvent) => {
            this.isDragging = false;
            startPos = { x: e.clientX, y: e.clientY };
            this.lastDragPos = { x: e.clientX, y: e.clientY };
            canvas.style.cursor = 'grabbing';
            canvas.setPointerCapture(e.pointerId);
        });

        canvas.addEventListener('pointermove', (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const wx = (e.clientX - rect.left - this.viewOffset.x) / (this.viewScale * 0.01);
            const wy = -(e.clientY - rect.top - this.viewOffset.y) / (this.viewScale * 0.01);
            const vs = UIStore.viewState.get();
            const origin = vs?.origin || { lat: 0, lon: 0 };
            const lat = origin.lat + (wy / 111319.9);
            const lon = origin.lon + (wx / (111319.9 * Math.cos(lat * Math.PI / 180)));
            this.coordsEl.textContent = `${lat.toFixed(4)}° ${lon.toFixed(4)}°`;

            if (e.buttons === 1) {
                const dist = Math.sqrt(Math.pow(e.clientX - startPos.x, 2) + Math.pow(e.clientY - startPos.y, 2));
                if (dist > 5) {
                    this.isDragging = true;
                }

                if (this.isDragging) {
                    this.viewOffset.x += e.clientX - this.lastDragPos.x;
                    this.viewOffset.y += e.clientY - this.lastDragPos.y;
                    this.lastDragPos = { x: e.clientX, y: e.clientY };
                    this.applyTransform();
                }
            }
        });

        canvas.addEventListener('pointerup', (e: PointerEvent) => {
            canvas.releasePointerCapture(e.pointerId);
            console.log('Map PointerUp', { isDragging: this.isDragging });
            if (!this.isDragging) {
                // Handle Click (Command Placement)
                const selectedId = UIStore.selectedEntityId.get();
                console.log('Selected Entity:', selectedId);
                if (selectedId) {
                    const rect = canvas.getBoundingClientRect();
                    const wx = (e.clientX - rect.left - this.viewOffset.x) / (this.viewScale * 0.01);
                    const wy = -(e.clientY - rect.top - this.viewOffset.y) / (this.viewScale * 0.01);

                    const vs = UIStore.viewState.get();
                    const unit = vs?.units.find((u: any) => u.id === selectedId);
                    console.log('Unit found:', !!unit, 'VS units:', vs?.units.length);

                    if (unit) {
                        logger.info('Placing waypoint', { entityId: selectedId, x: wx, y: wy });
                        sdkClient.dispatch({
                            type: 'SetCourse',
                            entityId: selectedId,
                            position: { x: wx, y: wy, z: unit.pos.z },
                            speedKts: 300 // Default transit speed
                        });
                    }
                }
            }
            this.isDragging = false;
            canvas.style.cursor = 'crosshair';
        });
        canvas.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();
            this.viewScale *= e.deltaY > 0 ? 0.9 : 1.1;
            this.viewScale = Math.max(0.01, Math.min(100, this.viewScale));
            this.applyTransform();
        }, { passive: false });
    }

    private applyTransform() {
        this.worldContainer.position.set(this.viewOffset.x, this.viewOffset.y);
        this.worldContainer.scale.set(this.viewScale);
    }

    protected onUnmount() {
        for (const layer of this.layers.values()) layer.destroy?.();
        this.layers.clear();
        this.app?.destroy(true);
    }
}

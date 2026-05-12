import { Application } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { MapState, MapViewState } from './MapState';
import { MapLayer } from './MapLayer';
import { LayerRegistry } from './LayerRegistry';
import { latLonToWorld } from './CoordUtils';

/**
 * MapRenderer: PixiJS-based rendering engine for the tactical map.
 * Decoupled from global store, receives state via MapState.
 */
export class MapRenderer {
    private app: Application;
    public viewport: Viewport;
    private layers = new Map<string, MapLayer>();
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;
    private lastOrigin: { lat: number; lon: number } | null = null;
    private subscriptions: (() => void)[] = [];
    private state: MapState;
    private layerRegistry: LayerRegistry;
    private pipeline: any;

    constructor(state: MapState, layerRegistry: LayerRegistry, pipeline: any) {
        this.state = state;
        this.layerRegistry = layerRegistry;
        this.pipeline = pipeline;
        this.app = new Application();
        this.viewport = null!;
    }

    async init(containerElement: HTMLElement) {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            await this.app.init({
                resizeTo: containerElement,
                background: 0x0a0a0a,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            });

            containerElement.appendChild(this.app.canvas as HTMLCanvasElement);

            this.viewport = new Viewport({
                screenWidth: containerElement.clientWidth,
                screenHeight: containerElement.clientHeight,
                worldWidth: 10000000, // 10,000 km
                worldHeight: 10000000,
                events: this.app.renderer.events,
            });

            this.app.stage.addChild(this.viewport);

            this.viewport
                .drag()
                .pinch()
                .wheel()
                .decelerate();

            // Center the viewport initially
            this.viewport.moveCenter(0, 0);
            this.viewport.setZoom(0.01);

            this.isInitialized = true;

            // 1. Subscribe to LayerRegistry for new layers
            this.subscriptions.push(this.layerRegistry.availableLayers.subscribe(metas => {
                for (const meta of metas) {
                    if (!this.layers.has(meta.id)) {
                        const layer = this.layerRegistry.getLayer(meta.id);
                        if (layer) this.addLayer(layer);
                    }
                }
            }));

            // 2. Subscribe to MapState for view state updates
            this.subscriptions.push(this.state.viewState.subscribe(vs => {
                if (vs && vs.origin) {
                    const origin = vs.origin;
                    
                    // Detect origin shift (e.g. joining a new match)
                    if (!this.lastOrigin || this.lastOrigin.lat !== origin.lat || this.lastOrigin.lon !== origin.lon) {
                        this.lastOrigin = origin;
                        
                        // Clear layers to avoid coordinate artifacts
                        this.layers.forEach(layer => {
                            if (layer.id === 'terrain') {
                                layer.destroy?.();
                                void layer.init?.();
                            }
                        });

                        this.viewport.moveCenter(0, 0);
                        if (this.viewport.scale.x < 0.001) {
                            this.viewport.setZoom(0.01);
                        }
                    }
                    
                    this.update(vs);
                }
            }));

            // Re-render layers on viewport changes (for resolution scaling)
            this.viewport.on('zoomed', () => {
                const vs = this.state.viewState.get();
                if (vs) {
                    this.state.mapScale.set(this.viewport.scale.x);
                    this.update(vs);
                }
            });

            // Track mouse movement for telemetry
            this.viewport.on('pointermove', (e) => {
                const vs = this.state.viewState.get();
                if (vs && vs.origin) {
                    const worldPos = this.viewport.toWorld(e.global.x, e.global.y);
                    const latLon = worldToLatLon(worldPos.x, worldPos.y, vs.origin);
                    this.state.pointerLatLon.set(latLon);
                    
                    const elev = this.pipeline.getElevation(latLon.lat, latLon.lon);
                    this.state.pointerElevation.set(elev);
                }
            });
        })();

        return this.initPromise;
    }

    private addLayer(layer: MapLayer) {
        this.layers.set(layer.id, layer);
        this.viewport.addChild(layer.container);
        
        // Setup visibility subscription
        const metadata = this.layerRegistry.getMetadata(layer.id);
        const sig = this.state.getLayerVisibility(layer.id, metadata?.defaultOn ?? true);
        this.subscriptions.push(sig.subscribe(visible => {
            layer.container.visible = visible;
            if (visible) {
                const vs = this.state.viewState.get();
                if (vs) layer.update(vs, this.viewport.scale.x, this.viewport.getVisibleBounds());
            }
        }));
    }

    private update(state: MapViewState) {
        if (!this.isInitialized) return;

        const viewScale = this.viewport.scale.x;
        const bounds = this.viewport.getVisibleBounds();
        
        for (const layer of this.layers.values()) {
            if (layer.container.visible) {
                layer.update(state, viewScale, bounds);
            }
        }
    }

    destroy() {
        if (!this.isInitialized) return;
        
        this.subscriptions.forEach(unsub => unsub());
        this.subscriptions = [];

        this.layers.forEach(l => {
            if (this.viewport && l.container) {
                this.viewport.removeChild(l.container);
            }
        });
        this.layers.clear();

        try {
            if (this.app) {
                this.app.destroy({ removeView: true });
            }
        } catch (e) {
            console.warn('MapRenderer: Error during destroy', e);
        }
        this.isInitialized = false;
        this.initPromise = null;
    }

    screenToWorld(x: number, y: number) {
        return this.viewport.toWorld(x, y);
    }

    worldToScreen(x: number, y: number) {
        return this.viewport.toScreen(x, y);
    }
}

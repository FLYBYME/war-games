import { Application } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { UIStore, ViewState } from './UIStore';
import { logger } from './Logger';
import { MapLayer } from './map/MapLayer';
import { layerRegistry } from './map/LayerRegistry';
import { latLonToWorld } from './map/CoordUtils';

export class MapEngine {
    private app: Application;
    public viewport: Viewport;
    private layers = new Map<string, MapLayer>();
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;
    private lastOrigin: { lat: number; lon: number } | null = null;
    private lastMatchId: string | null = null;
    private subscriptions: (() => void)[] = [];

    constructor() {
        this.app = new Application();
        // Viewport will be initialized after app.init
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
            logger.info('MapRenderer initialized');

            // 1. Subscribe to LayerRegistry for new layers
            this.subscriptions.push(layerRegistry.availableLayers.subscribe(metas => {
                for (const meta of metas) {
                    if (!this.layers.has(meta.id)) {
                        const layer = layerRegistry.getLayer(meta.id);
                        if (layer) this.addLayer(layer);
                    }
                }
            }));

            // 2. Subscribe to UIStore for view state updates
            this.subscriptions.push(UIStore.viewState.subscribe(vs => {
                if (vs && vs.origin) {
                    const origin = vs.origin as { lat: number; lon: number };
                    
                    // Detect origin shift (e.g. joining a new match)
                    if (!this.lastOrigin || this.lastOrigin.lat !== origin.lat || this.lastOrigin.lon !== origin.lon) {
                        logger.info('MapRenderer: Origin shift detected, resetting viewport');
                        this.lastOrigin = origin;
                        
                        // Clear layers to avoid coordinate artifacts
                        this.layers.forEach(layer => {
                            if (layer.id === 'terrain') {
                                layer.destroy?.();
                                void layer.init?.();
                            }
                        });

                        this.viewport.moveCenter(0, 0);
                        // Only reset zoom if it was a major jump or first load
                        if (this.viewport.scale.x < 0.001) {
                            this.viewport.setZoom(0.01);
                        }
                    }
                    
                    this.update(vs);
                }
            }));

            // 3. Listen for camera jumps
            UIStore.cameraTarget.subscribe(target => {
                if (target && this.viewport && this.isInitialized) {
                    const vs = UIStore.viewState.get();
                    if (!vs) return;
                    const pos = latLonToWorld(target.lat, target.lon, vs.origin as { lat: number, lon: number });
                    this.viewport.animate({
                        position: { x: pos.x, y: pos.y },
                        scale: 0.1,
                        time: 1000,
                        ease: 'easeInOutQuad'
                    });
                }
            });

            // Re-render layers on viewport changes (for resolution scaling)
            this.viewport.on('zoomed', () => {
                const vs = UIStore.viewState.get();
                if (vs) this.update(vs);
            });
        })();

        return this.initPromise;
    }

    private addLayer(layer: MapLayer) {
        this.layers.set(layer.id, layer);
        this.viewport.addChild(layer.container);
        
        // Setup visibility subscription
        const sig = UIStore.getLayerSignal(layer.id);
        this.subscriptions.push(sig.subscribe(visible => {
            layer.container.visible = visible;
            if (visible) {
                const vs = UIStore.viewState.get();
                if (vs) layer.update(vs, this.viewport.scale.x, this.viewport.getVisibleBounds());
            }
        }));

        logger.debug(`MapRenderer: Layer added: ${layer.id}`);
    }

    private update(state: ViewState) {
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
        
        // Unsubscribe all
        this.subscriptions.forEach(unsub => unsub());
        this.subscriptions = [];

        // Remove layers from viewport but DON'T destroy them (they are managed by LayerRegistry)
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

    // Coordinate conversion utilities
    screenToWorld(x: number, y: number) {
        return this.viewport.toWorld(x, y);
    }

    worldToScreen(x: number, y: number) {
        return this.viewport.toScreen(x, y);
    }
}

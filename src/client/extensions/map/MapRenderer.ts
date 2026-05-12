import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { MapState, MapViewState } from './MapState';
import { MapLayer } from './MapLayer';
import { LayerRegistry } from './LayerRegistry';
import { latLonToWorld, worldToLatLon } from './CoordUtils';

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
    private textPool: any[] = [];
    private activeTexts: any[] = [];
    private state: MapState;
    private layerRegistry: LayerRegistry;
    private pipeline: any;
    private topRuler = new Graphics();
    private leftRuler = new Graphics();

    constructor(state: MapState, layerRegistry: LayerRegistry, pipeline: any) {
        this.state = state;
        this.layerRegistry = layerRegistry;
        this.pipeline = pipeline;
        this.app = new Application();
        this.viewport = null!;
    }

    private subscriptions: (() => void)[] = [];

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

            this.viewport.clampZoom({
                minScale: 0.0000512, // Corresponds to z1
                maxScale: 10.0       // High precision z18+
            });

            this.app.stage.addChild(this.viewport);
            
            // Add Rulers to stage (pinned to edges)
            this.app.stage.addChild(this.topRuler);
            this.app.stage.addChild(this.leftRuler);

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

            this.viewport.on('moved', () => {
                const vs = this.state.viewState.get();
                if (vs) {
                    this.state.viewportBounds.set(this.viewport.getVisibleBounds());
                    this.update(vs);
                }
                this.updateRulers();
            });

            this.viewport.on('zoomed', () => {
                const vs = this.state.viewState.get();
                if (vs) {
                    this.state.mapScale.set(this.viewport.scale.x);
                    this.state.viewportBounds.set(this.viewport.getVisibleBounds());
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

            this.updateRulers();
        })();

        return this.initPromise;
    }

    public resize() {
        if (!this.isInitialized) return;
        this.app.resize();
        this.viewport.resize(
            this.app.screen.width,
            this.app.screen.height
        );
        this.updateRulers();
    }

    private updateRulers() {
        if (!this.isInitialized || !this.lastOrigin) return;

        const bounds = this.viewport.getVisibleBounds();
        const origin = this.lastOrigin;

        // Clean up active texts
        this.activeTexts.forEach(t => {
            t.visible = false;
            this.textPool.push(t);
        });
        this.activeTexts = [];

        const getText = (content: string) => {
            let t = this.textPool.pop();
            if (!t) {
                t = new Text({
                    text: '',
                    style: new TextStyle({
                        fill: '#00ff00',
                        fontSize: 10,
                        fontFamily: 'monospace'
                    })
                });
                this.app.stage.addChild(t);
            }
            t.text = content;
            t.visible = true;
            this.activeTexts.push(t);
            return t;
        };

        // Top Ruler (Longitude)
        this.topRuler.clear();
        this.topRuler.rect(0, 0, this.viewport.screenWidth, 20).fill({ color: 0x1a1a1a, alpha: 0.8 });
        
        // Left Ruler (Latitude)
        this.leftRuler.clear();
        this.leftRuler.rect(0, 0, 20, this.viewport.screenHeight).fill({ color: 0x1a1a1a, alpha: 0.8 });

        const nw = worldToLatLon(bounds.x, bounds.y, origin);
        const se = worldToLatLon(bounds.x + bounds.width, bounds.y + bounds.height, origin);

        const lonRange = Math.abs(se.lon - nw.lon);
        let spacing = 1.0;
        if (lonRange < 0.1) spacing = 0.01;
        else if (lonRange < 1) spacing = 0.1;
        else if (lonRange < 10) spacing = 1.0;
        else spacing = 10.0;

        // Draw Lon ticks
        const startLon = Math.floor(Math.min(nw.lon, se.lon) / spacing) * spacing;
        const endLon = Math.ceil(Math.max(nw.lon, se.lon) / spacing) * spacing;

        for (let lon = startLon; lon <= endLon; lon += spacing) {
            const worldPos = latLonToWorld(origin.lat, lon, origin);
            const screenPos = this.viewport.toScreen(worldPos.x, worldPos.y);
            
            if (screenPos.x >= 0 && screenPos.x <= this.viewport.screenWidth) {
                this.topRuler.moveTo(screenPos.x, 0).lineTo(screenPos.x, 15).stroke({ color: 0x00ff00, width: 1 });
                const label = getText(lon.toFixed(spacing < 0.1 ? 2 : 1));
                label.position.set(screenPos.x + 2, 2);
            }
        }

        // Draw Lat ticks
        const latRange = Math.abs(se.lat - nw.lat);
        let latSpacing = spacing;
        
        const startLat = Math.floor(Math.min(nw.lat, se.lat) / latSpacing) * latSpacing;
        const endLat = Math.ceil(Math.max(nw.lat, se.lat) / latSpacing) * latSpacing;

        for (let lat = startLat; lat <= endLat; lat += latSpacing) {
            const worldPos = latLonToWorld(lat, origin.lon, origin);
            const screenPos = this.viewport.toScreen(worldPos.x, worldPos.y);
            
            if (screenPos.y >= 0 && screenPos.y <= this.viewport.screenHeight) {
                this.leftRuler.moveTo(0, screenPos.y).lineTo(10, screenPos.y).stroke({ color: 0x00ff00, width: 1 });
                const label = getText(lat.toFixed(latSpacing < 0.1 ? 2 : 1));
                label.position.set(12, screenPos.y - 6);
                label.rotation = 0;
            }
        }
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

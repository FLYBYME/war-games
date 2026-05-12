import { Extension, ExtensionContext } from '../../core/extensions/Extension';
import { ViewProvider } from '../../core/extensions/ViewProvider';
import { MatchServiceEvents } from '../../core/services/MatchService';
import { MapState, entitySummaryToMapUnit } from './MapState';
import { MapRenderer } from './MapRenderer';
import { LayerRegistry } from './LayerRegistry';
import { GridLayer } from './layers/GridLayer';
import { TerrainLayer } from './layers/TerrainLayer';
import { UnitsLayer } from './layers/UnitsLayer';
import { WEZLayer } from './layers/WEZLayer';
import { TracksLayer } from './layers/TracksLayer';
import { ThreatLayer } from './layers/ThreatLayer';
import { MapDataPipeline } from './MapDataPipeline';
import * as uiLib from '../../ui-lib';
import { worldToLatLon } from './CoordUtils';
import { PanelEvents } from '../../core/LayoutManager';

/**
 * MapExtension: The primary tactical visualization engine for War Games.
 * Now wired to MatchService and SimStreamService for real data.
 */
export const MapExtension: Extension = {
    id: 'war-games.map',
    name: 'Tactical Map',
    version: '2.2.0',

    activate(context: ExtensionContext) {
        const ide = context.ide;

        // 1. Initialize Extension-Level State
        const mapState = new MapState();
        const layerRegistry = new LayerRegistry();
        const terrainUrl = ide.settings.get<string>('map.terrainServer') || window.location.origin;
        const enableCaching = ide.settings.getWithDefault<boolean>('map.enableCaching', true);
        const pipeline = new MapDataPipeline(terrainUrl, enableCaching);

        // 2. Register Default Layers
        const terrainMeta = { id: 'terrain', label: 'Elevation Data', group: 'Basemap', defaultOn: false };
        layerRegistry.register(new TerrainLayer(pipeline), terrainMeta);
        mapState.getLayerVisibility(terrainMeta.id, terrainMeta.defaultOn);

        const gridMeta = { id: 'grid', label: 'Coordinate Grid', group: 'Overlays', defaultOn: true };
        layerRegistry.register(new GridLayer(), gridMeta);
        mapState.getLayerVisibility(gridMeta.id, gridMeta.defaultOn);

        const unitsMeta = { id: 'units', label: 'Active Units', group: 'Entities', defaultOn: true };
        layerRegistry.register(new UnitsLayer(), unitsMeta);
        mapState.getLayerVisibility(unitsMeta.id, unitsMeta.defaultOn);

        const wezMeta = { id: 'wez', label: 'Weapon Envelopes', group: 'Overlays', defaultOn: false };
        layerRegistry.register(new WEZLayer(), wezMeta);
        mapState.getLayerVisibility(wezMeta.id, wezMeta.defaultOn);

        const tracksMeta = { id: 'tracks', label: 'Entity Tracks', group: 'Overlays', defaultOn: false };
        layerRegistry.register(new TracksLayer(), tracksMeta);
        mapState.getLayerVisibility(tracksMeta.id, tracksMeta.defaultOn);

        const threatMeta = { id: 'threats', label: 'Threat Contacts', group: 'Intelligence', defaultOn: false };
        layerRegistry.register(new ThreatLayer(), threatMeta);
        mapState.getLayerVisibility(threatMeta.id, threatMeta.defaultOn);

        // 3. Register the Main View Provider (Center Panel)
        const mapViewProvider: ViewProvider = {
            id: 'map.view',
            name: 'Tactical Map',
            resolveView: async (container, disposables) => {
                const renderer = new MapRenderer(mapState, layerRegistry, pipeline);
                await renderer.init(container);

                // 3. Telemetry HUD (Bottom Left)
                const hud = new uiLib.MapHUD({
                    lat: 0,
                    lon: 0,
                    elevation: 0,
                    scaleKm: 0
                });
                container.appendChild(hud.getElement());

                const updateOverlay = () => {
                    const scale = mapState.mapScale.get();
                    const mPerPx = 1 / scale;
                    
                    hud.updateProps({
                        lat: mapState.pointerLatLon.get()?.lat ?? null,
                        lon: mapState.pointerLatLon.get()?.lon ?? null,
                        elevation: mapState.pointerElevation.get(),
                        scaleKm: (mPerPx * 100) / 1000
                    });
                };

                disposables.push({ dispose: mapState.pointerLatLon.subscribe(updateOverlay) });
                disposables.push({ dispose: mapState.pointerElevation.subscribe(updateOverlay) });
                disposables.push({ dispose: mapState.mapScale.subscribe(updateOverlay) });

                // Handle panel/window resizing
                const onResize = () => renderer.resize();
                const resizeSubId = ide.commands.on(PanelEvents.PANEL_RESIZE, onResize);
                window.addEventListener('resize', onResize);

                disposables.push({
                    dispose: () => {
                        renderer.destroy();
                        hud.getElement().remove();
                        ide.commands.off(resizeSubId);
                        window.removeEventListener('resize', onResize);
                    }
                });

                // Wire UnitsLayer click-to-select → IDE.selection
                const unitsLayer = layerRegistry.getLayer('units') as UnitsLayer | undefined;
                if (unitsLayer) {
                    unitsLayer.onEntityClicked = (entityId, event) => {
                        if (event.ctrlKey || event.metaKey) {
                            ide.selection.toggle(entityId);
                        } else {
                            ide.selection.select(entityId);
                        }
                    };
                    unitsLayer.onEntityHovered = (entityId) => {
                        mapState.hoveredEntityId.set(entityId);
                    };

                    // Sync selection state back to the layer
                    const unsub = ide.selection.primaryId.subscribe((selectedId) => {
                        unitsLayer.selectedId = selectedId;
                        // Force a re-render
                        const vs = mapState.viewState.get();
                        if (vs) {
                            const viewScale = renderer.viewport.scale.x;
                            unitsLayer.update(vs, viewScale, renderer.viewport.getVisibleBounds());
                        }
                    });
                    disposables.push({ dispose: unsub });
                }

                // Click on empty space to deselect
                renderer.viewport.on('pointerdown', () => {
                    ide.selection.clear();
                });

                // If a match is already active, start syncing immediately
                const matchId = ide.matches.currentMatchId.get();
                if (matchId) {
                    void startDataSync(matchId, mapState, context);
                }
            }
        };

        ide.views.registerProvider('center-panel', mapViewProvider);

        // 4. Register the Layer Manager View Provider (Sidebar)
        const layerManagerProvider: ViewProvider = {
            id: 'map.layer-manager',
            name: 'Map Layers',
            resolveView: (container, disposables) => {
                const column = new uiLib.Column({ padding: 'md', gap: 'sm', fill: true });

                const header = new uiLib.Heading({ text: 'MAP LAYERS', level: 4, transform: 'uppercase' });

                const renderLayers = (metas: { id: string; label: string }[]) => {
                    const children: (uiLib.BaseComponent<any>)[] = [header];

                    metas.forEach(meta => {
                        const checkbox = new uiLib.Checkbox({
                            label: meta.label,
                            checked: mapState.getLayerVisibility(meta.id).get(),
                            onChange: (checked: boolean) => mapState.setLayerVisibility(meta.id, checked)
                        });
                        children.push(checkbox);
                    });

                    column.updateProps({ children });
                };

                const unsub = layerRegistry.availableLayers.subscribe(renderLayers);
                disposables.push({ dispose: unsub });

                column.mount(container);
            }
        };

        ide.views.registerProvider('left-panel', layerManagerProvider);

        // 4.5 Register Map Analytics (Right Panel)
        const mapAnalyticsProvider: ViewProvider = {
            id: 'map.analytics',
            name: 'Map Analytics',
            resolveView: (container, disposables) => {
                const column = new uiLib.Column({ padding: 'md', gap: 'md', fill: true });

                const renderStats = () => {
                    const stats = pipeline.getStats();
                    const srv = pipeline.getServerStats();
                    const vs = mapState.viewState.get();
                    const scale = mapState.mapScale.get();
                    const bounds = mapState.viewportBounds.get();

                    // Calculate zoom level (Clamped to z0-z20)
                    // Formula: z = log2(scale * worldSize / tileSize)
                    const zoom = Math.max(0, Math.min(20, Math.floor(Math.log2(scale * 10000000 / 256))));

                    const children: uiLib.BaseComponent<any>[] = [
                        new uiLib.Heading({ text: 'CLIENT PIPELINE', level: 4 }),
                        new uiLib.Text({ text: `L1 Cache: ${stats.cacheSize} tiles` }),
                        new uiLib.Text({ text: `Active Requests: ${stats.activeRequests}` }),
                        new uiLib.Text({ text: `Queue Depth: ${stats.queueDepth}` }),
                        new uiLib.Divider({}),
                    ];

                    if (srv) {
                        const mb = (v: number) => (v / 1024 / 1024).toFixed(1) + ' MB';
                        children.push(new uiLib.Heading({ text: 'SERVER (WORKER NODE)', level: 4 }));
                        children.push(new uiLib.Text({ text: `Harvester: ${srv.harvester.status} (${srv.harvester.percentComplete.toFixed(1)}%)` }));
                        children.push(new uiLib.Text({ text: `Disk Cache: ${srv.cache.quadCount} tiles (${mb(srv.cache.dbSize)})` }));
                        children.push(new uiLib.Text({ text: `Memory: ${mb(srv.memory.rss)}` }));
                        children.push(new uiLib.Divider({}));
                    }

                    children.push(new uiLib.Heading({ text: 'VIEWPORT STATS', level: 4 }));
                    children.push(new uiLib.Text({ text: `Zoom Level: z${zoom}` }));
                    children.push(new uiLib.Text({ text: `Scale: ${scale.toFixed(6)}` }));

                    if (vs && vs.origin && bounds) {
                        const nw = worldToLatLon(bounds.x, bounds.y, vs.origin);
                        const se = worldToLatLon(bounds.x + bounds.width, bounds.y + bounds.height, vs.origin);

                        children.push(new uiLib.Text({ text: `Origin: ${vs.origin.lat.toFixed(4)}, ${vs.origin.lon.toFixed(4)}` }));
                        children.push(new uiLib.Divider());
                        children.push(new uiLib.Heading({ text: 'GEOGRAPHIC BOUNDS', level: 4 }));
                        children.push(new uiLib.Text({ text: `NW: ${nw.lat.toFixed(6)}, ${nw.lon.toFixed(6)}` }));
                        children.push(new uiLib.Text({ text: `SE: ${se.lat.toFixed(6)}, ${se.lon.toFixed(6)}` }));

                        children.push(new uiLib.Divider());
                        children.push(new uiLib.Heading({ text: 'TILE DEBUG (PREDICTED)', level: 4 }));

                        // Calculate tile indices
                        const tileScale = Math.pow(2, zoom);
                        const worldToTile = (val: number) => Math.floor(((val + 5000000) / 10000000) * tileScale);

                        const x1 = worldToTile(bounds.x);
                        const y1 = worldToTile(bounds.y);
                        const x2 = worldToTile(bounds.x + bounds.width);
                        const y2 = worldToTile(bounds.y + bounds.height);

                        children.push(new uiLib.Text({ text: `Z: ${zoom} | X: ${x1} to ${x2} | Y: ${y1} to ${y2}` }));
                        const totalTiles = (x2 - x1 + 1) * (y2 - y1 + 1);
                        children.push(new uiLib.Text({ text: `Projected Fetch: ${totalTiles} tiles` }));
                    }

                    column.updateProps({ children });
                };

                const timer = setInterval(renderStats, 1000);
                disposables.push({ dispose: () => clearInterval(timer) });

                renderStats();
                column.mount(container);
            }
        };

        ide.views.registerProvider('right-panel', mapAnalyticsProvider);

        // 5. Register Activity Bar Icons
        ide.activityBar.registerItem({
            id: 'map.layer-manager',
            location: 'left-panel',
            icon: 'fas fa-layer-group',
            title: 'Map Layers',
            order: 10
        });

        ide.activityBar.registerItem({
            id: 'map.analytics',
            location: 'right-panel',
            icon: 'fas fa-chart-line',
            title: 'Map Analytics',
            order: 20
        });

        // 6. Register Commands and Menu Items
        ide.commands.register({
            id: 'map.resetCamera',
            label: 'Reset Camera',
            handler: () => {
                console.log('Reset Camera requested');
            }
        });

        ide.layout.header.menuBar.addMenuItem({
            id: 'map',
            label: 'Tactical',
            items: [
                { id: 'map:reset', label: 'Reset Camera', onClick: () => ide.commands.execute('map.resetCamera') }
            ]
        });

        // 7. React to Match Lifecycle
        ide.commands.on(MatchServiceEvents.MATCH_ACTIVATED, (data: unknown) => {
            if (typeof data === 'object' && data !== null && 'matchId' in data) {
                const payload = data as { matchId: string };
                void startDataSync(payload.matchId, mapState, context);
            }
        });

        ide.commands.on(MatchServiceEvents.MATCH_DEACTIVATED, () => {
            // Clear map state when match is deactivated
            mapState.viewState.update(prev => ({
                ...prev,
                units: [],
                tracks: [],
                currentTick: 0,
            }));
        });

        // Open the map by default
        void ide.views.renderView('center-panel', 'map.view');

        console.log('✅ MapExtension activated');
    }
};

/**
 * Start real-time data synchronization for the given match.
 * Subscribes to SimStreamService for entity position updates.
 */
async function startDataSync(matchId: string, mapState: MapState, context: ExtensionContext) {
    const ide = context.ide;
    const client = ide.getClient();

    console.log(`MapExtension: Starting data sync for match ${matchId}`);

    // 1. Fetch Environment (Datum)
    try {
        const env = await client.api.env.get({ matchId });
        mapState.viewState.update(prev => ({
            ...prev,
            origin: env.datum
        }));
    } catch (err) {
        console.error('MapExtension: Failed to fetch environment datum', err);
        // Fallback to default origin if needed
        mapState.viewState.update(prev => ({
            ...prev,
            origin: prev.origin ?? { lat: 21.0, lon: 107.0 }
        }));
    }

    // 2. Fetch initial entity state
    try {
        const entityList = await client.api.entity.list({ matchId });
        const mapUnits = entityList.entities.map(entitySummaryToMapUnit);
        mapState.viewState.update(prev => ({
            ...prev,
            units: mapUnits
        }));
    } catch (err) {
        console.error('MapExtension: Failed to fetch initial entities', err);
    }

    // 2. Subscribe to the multiplexed event stream for real-time updates
    const unsub = ide.stream.subscribe(matchId, (event) => {
        if ('type' in event) {
            switch (event.type) {
                case 'EntitySpawned': {
                    // Refetch entity list on spawn (simplest approach)
                    void client.api.entity.list({ matchId }).then(result => {
                        mapState.viewState.update(prev => ({
                            ...prev,
                            units: result.entities.map(entitySummaryToMapUnit),
                        }));
                    }).catch(() => { /* ignore */ });
                    break;
                }
                case 'EntityDestroyed': {
                    // Remove the destroyed entity from the local state
                    if (event.entityId) {
                        const deadId = event.entityId;
                        mapState.viewState.update(prev => ({
                            ...prev,
                            units: prev.units.filter(u => u.id !== deadId),
                        }));
                    }
                    break;
                }
                default: {
                    // Update tick for any event
                    if ('tick' in event && typeof event.tick === 'number') {
                        mapState.viewState.update(prev => ({
                            ...prev,
                            currentTick: event.tick,
                            timestamp: Date.now(),
                        }));
                    }
                    break;
                }
            }
        }
    });
    context.subscriptions.push({ dispose: unsub });
}


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

                // Add Telemetry Overlay
                const overlay = document.createElement('div');
                overlay.style.position = 'absolute';
                overlay.style.bottom = '10px';
                overlay.style.left = '10px';
                overlay.style.pointerEvents = 'none';
                overlay.style.color = '#00ff00';
                overlay.style.fontFamily = 'monospace';
                overlay.style.fontSize = '12px';
                overlay.style.background = 'rgba(0,0,0,0.5)';
                overlay.style.padding = '5px';
                overlay.style.borderLeft = '2px solid #00ff00';
                container.appendChild(overlay);

                const updateOverlay = () => {
                    const pos = mapState.pointerLatLon.get();
                    const elev = mapState.pointerElevation.get();
                    const scale = mapState.mapScale.get();
                    
                    // Simple scale bar calculation (meters per 100px)
                    const mPerPx = 1 / scale;
                    const scaleKm = (mPerPx * 100) / 1000;
                    
                    overlay.innerHTML = `
                        LAT: ${pos?.lat.toFixed(4) ?? '---'} 
                        LON: ${pos?.lon.toFixed(4) ?? '---'} 
                        ALT: ${elev !== null ? elev.toFixed(1) + 'm' : '---'}<br/>
                        SCALE: [ ${scaleKm.toFixed(2)} km ]
                    `;
                };

                disposables.push(mapState.pointerLatLon.subscribe(updateOverlay));
                disposables.push(mapState.pointerElevation.subscribe(updateOverlay));
                disposables.push(mapState.mapScale.subscribe(updateOverlay));

                disposables.push({
                    dispose: () => {
                        renderer.destroy();
                        overlay.remove();
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
                    const vs = mapState.viewState.get();
                    
                    column.updateProps({
                        children: [
                            new uiLib.Heading({ text: 'PIPELINE METRICS', level: 4 }),
                            new uiLib.Text({ text: `L1 Cache: ${stats.cacheSize} tiles` }),
                            new uiLib.Text({ text: `Active Requests: ${stats.activeRequests}` }),
                            new uiLib.Text({ text: `Queue Depth: ${stats.queueDepth}` }),
                            new uiLib.Divider(),
                            new uiLib.Heading({ text: 'VIEWPORT STATS', level: 4 }),
                            new uiLib.Text({ text: `Origin: ${vs?.origin?.lat.toFixed(2)}, ${vs?.origin?.lon.toFixed(2)}` }),
                            new uiLib.Text({ text: `Entities: ${vs?.units.length ?? 0}` }),
                            new uiLib.Text({ text: `Scale: ${mapState.mapScale.get().toFixed(6)}` }),
                        ]
                    });
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


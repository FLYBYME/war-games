import { Extension, ExtensionContext } from '../../core/extensions/Extension';
import { ViewProvider } from '../../core/extensions/ViewProvider';
import { MatchServiceEvents } from '../../core/services/MatchService';
import { MapState, entitySummaryToMapUnit } from './MapState';
import { MapRenderer } from './MapRenderer';
import { LayerRegistry } from './LayerRegistry';
import { GridLayer } from './layers/GridLayer';
import { UnitsLayer } from './layers/UnitsLayer';
import { WEZLayer } from './layers/WEZLayer';
import { TracksLayer } from './layers/TracksLayer';
import { ThreatLayer } from './layers/ThreatLayer';
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

        // 2. Register Default Layers
        layerRegistry.register(new GridLayer(), {
            id: 'grid',
            label: 'Coordinate Grid',
            group: 'Overlays',
            defaultOn: true
        });

        layerRegistry.register(new UnitsLayer(), {
            id: 'units',
            label: 'Active Units',
            group: 'Entities',
            defaultOn: true
        });

        layerRegistry.register(new WEZLayer(), {
            id: 'wez',
            label: 'Weapon Envelopes',
            group: 'Overlays',
            defaultOn: false
        });

        layerRegistry.register(new TracksLayer(), {
            id: 'tracks',
            label: 'Entity Tracks',
            group: 'Overlays',
            defaultOn: false
        });

        layerRegistry.register(new ThreatLayer(), {
            id: 'threats',
            label: 'Threat Contacts',
            group: 'Intelligence',
            defaultOn: false
        });

        // 3. Register the Main View Provider (Center Panel)
        const mapViewProvider: ViewProvider = {
            id: 'map.view',
            name: 'Tactical Map',
            resolveView: async (container, disposables) => {
                const renderer = new MapRenderer(mapState, layerRegistry);
                await renderer.init(container);

                disposables.push({
                    dispose: () => renderer.destroy()
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
                    const children: (uiLib.Heading | uiLib.Checkbox)[] = [header];

                    metas.forEach(meta => {
                        const checkbox = new uiLib.Checkbox({
                            label: meta.label,
                            checked: mapState.getLayerVisibility(meta.id).get(),
                            onChange: (checked) => mapState.setLayerVisibility(meta.id, checked)
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

        // 5. Register Activity Bar Icon
        ide.activityBar.registerItem({
            id: 'map.layer-manager',
            location: 'left-panel',
            icon: 'fas fa-layer-group',
            title: 'Map Layers',
            order: 10
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
            const payload = data as { matchId: string };
            void startDataSync(payload.matchId, mapState, context);
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

    // 1. Fetch initial entity state
    try {
        const entityList = await client.api.entity.list({ matchId });
        const mapUnits = entityList.entities.map(entitySummaryToMapUnit);
        mapState.viewState.update(prev => ({
            ...prev,
            units: mapUnits,
            origin: entityList.entities.length > 0
                ? { lat: entityList.entities[0].position.y, lon: entityList.entities[0].position.x }
                : prev.origin ?? { lat: 21.0, lon: 107.0 },
        }));
    } catch (err) {
        console.error('MapExtension: Failed to fetch initial entities', err);
        // Set a default origin so the grid renders
        mapState.viewState.update(prev => ({
            ...prev,
            origin: prev.origin ?? { lat: 21.0, lon: 107.0 },
        }));
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


import { Extension, ExtensionContext } from '../../core/extensions/Extension';
import { ViewProvider } from '../../core/extensions/ViewProvider';
import { MapState } from './MapState';
import { MapRenderer } from './MapRenderer';
import { LayerRegistry } from './LayerRegistry';
import { GridLayer } from './layers/GridLayer';
import { UnitsLayer } from './layers/UnitsLayer';
import * as uiLib from '../../ui-lib';

/**
 * MapExtension: The primary tactical visualization engine for War Games.
 */
export const MapExtension: Extension = {
    id: 'war-games.map',
    name: 'Tactical Map',
    version: '2.0.0',

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

                // Request initial data update
                void startDataSync(mapState, context);
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

                const renderLayers = (metas: any[]) => {
                    const children: any[] = [header];

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
                // TODO: Implement camera reset in renderer
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

        // Open the map by default
        void ide.views.renderView('center-panel', 'map.view');

        console.log('Map Extension activated');
    }
};

/**
 * Internal function to handle data synchronization with the simulation server.
 */
async function startDataSync(mapState: MapState, context: ExtensionContext) {
    // This is where we will hook up the real WarGamesClientV2 stream
    // For now, let's provide a "no-fake" fallback that waits for real data
    console.log('Map Extension: Starting data synchronization...');
    
    // Mocking the bridge to the backend for now until SDK is confirmed
    // In a real run, this would be:
    // const client = new WarGamesClientV2();
    // client.api.sim.get_stream({ matchId: '...' }).subscribe(event => ...)

    // Setting a default origin so the grid renders
    mapState.viewState.update(prev => ({
        ...prev,
        origin: { lat: 21.0, lon: 107.0 } // Gulf of Tonkin
    }));
}


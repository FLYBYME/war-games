# Configure Map Terrain Server URL

The user is experiencing tile fetch failures because the `MapDataPipeline` is hardcoded to use the IDE's origin (`window.location.origin`), while the map worker is running on a different port (8080).

## User Review Required

> [!IMPORTANT]
> I am adding a new setting `map.terrainServer` that defaults to `http://localhost:8080`. This assumes the standard worker port. If the user is running the worker on a different IP or port, they can change this setting in the IDE.

## Proposed Changes

### Map Extension

#### [MODIFY] [MapExtension.ts](file:///home/ubuntu/code/war-games/src/client/extensions/map/MapExtension.ts)
- Register a new configuration node `map` with property `map.terrainServer`.
- Update the instantiation of `MapDataPipeline` to use the value from `ide.settings.get('map.terrainServer')`.
- Add a listener to update the pipeline if the setting changes (though `MapDataPipeline` is currently created once, I might need to make it more dynamic or just accept that a restart/reload is needed, which is standard for extension settings).

## Verification Plan

### Manual Verification
1. Open the IDE.
2. Observe the map failing to load tiles (if the setting is wrong).
3. Update the setting `map.terrainServer` to the correct worker URL (e.g., `http://localhost:8080`).
4. Reload the map or IDE and verify tiles are fetching correctly.

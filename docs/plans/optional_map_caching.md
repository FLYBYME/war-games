# Optional Map Data Caching

The goal is to allow users to enable or disable persistent client-side storage for terrain tiles via the IDE configuration. This is useful for debugging, avoiding disk space issues, or when working with rapidly changing terrain data.

## Proposed Changes

### Core Configuration

#### [MODIFY] [IDE.ts](file:///home/ubuntu/code/war-games/src/client/core/IDE.ts)
- Add `map.enableCaching` to the `core` configuration node properties.
- Type: `boolean`, Default: `true`.

### Map Extension

#### [MODIFY] [TerrainCache.ts](file:///home/ubuntu/code/war-games/src/client/extensions/map/TerrainCache.ts)
- Add a public `enabled` property.
- Update `getTile`, `putTile`, `putTiles`, and `clear` to check this property.
- If `enabled` is false, `getTile` should return `null` immediately.

#### [MODIFY] [MapDataPipeline.ts](file:///home/ubuntu/code/war-games/src/client/extensions/map/MapDataPipeline.ts)
- Add an `enableCaching` parameter to the constructor (default `true`).
- Set `this.persistentCache.enabled = enableCaching`.

#### [MODIFY] [MapExtension.ts](file:///home/ubuntu/code/war-games/src/client/extensions/map/MapExtension.ts)
- Retrieve `map.enableCaching` from `ide.settings`.
- Pass it to the `MapDataPipeline` constructor.

### Tests

#### [MODIFY] [MapDataPipeline.test.ts](file:///home/ubuntu/code/war-games/src/tests/v2/terrain/MapDataPipeline.test.ts)
- Update constructor call to include the new parameter (or rely on default).

## Verification Plan

### Automated Tests
- Run `npm test src/tests/v2/terrain/MapDataPipeline.test.ts` to ensure existing logic still works.
- Add a new test case to verify that when `enableCaching` is false, `TerrainCache` is bypassed.

### Manual Verification
- Change the setting in the UI (if a settings UI exists) or via the console.
- Verify that IndexedDB is not populated when caching is disabled.

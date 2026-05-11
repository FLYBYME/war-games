# Implementation Plan: Smart Terrain Pipeline

The current terrain system uses a "dumb" tiling strategy where each 256x256 quad tile is requested individually. This results in hundreds of network requests, high latency, and poor performance during rapid panning or zooming.

## Objectives
1. **Reduce Request Volume**: Use viewport-based bundling to fetch multiple tiles in a single request.
2. **Minimize Latency**: Implement a persistent client-side cache using IndexedDB.
3. **Optimized Transfer**: Use a custom binary "Theater Bundle" format to minimize payload size.
4. **Predictive Loading**: Implement background prefetching based on movement vectors.

## Proposed Changes

### 1. Worker Node (Server)

#### [NEW] `TheaterBundlerService.ts`
- Implement a service that takes a `Viewport` (bounding box + LOD) and returns a single `TheaterBundle` binary blob.
- The bundle will consist of:
    - Header: Magic Number, Version, Tile Count.
    - TOC: List of `(z, x, y, offset, length)`.
    - Payload: Concatenated raw tile data.

#### [MODIFY] `worker_node.ts`
- Add `POST /api/v2/terrain/theater/bundle` endpoint.

### 2. Tactical UI (Client)

#### [NEW] `TerrainCache.ts`
- Use `idb` (IndexedDB) to store tiles locally.
- Keys: `tile:${z}:${x}:${y}`.
- Values: Uint8Array.
- Expiration: Managed based on theater version.

#### [MODIFY] `MapDataPipeline.ts`
- Change `getQuadTile` to `getViewportBundle`.
- Logic:
    1. Identify all tiles needed for the current viewport.
    2. Filter out tiles already in the local IndexedDB.
    3. If > 2 tiles are missing, request a `TheaterBundle` from the worker.
    4. Decompress/Unpack the bundle and save to IndexedDB.
    5. Return the requested tiles.

### 3. Build & Protocol

#### [NEW] `TheaterBundleFormat.ts`
- Shared utility for packing/unpacking the binary bundle.

## Verification Plan

### Performance Metrics
- Compare "Total Network Requests" for a 10km pan before/after.
- Compare "Time to Full LOD" for a theater load.
- Verify "0 Requests" on subsequent loads of the same area.

### Manual Verification
- Panning at high speed to ensure tiles load in "chunks" rather than one-by-one.
- Checking Developer Tools -> Application -> IndexedDB to verify storage.

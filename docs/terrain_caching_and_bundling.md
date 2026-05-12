# Terrain Data Architecture: Caching & Bundling

This document summarizes the tactical map's terrain data pipeline, focusing on the client-side caching mechanism, the server-side theater bundling system, and the "Zero-Install" streaming strategy.

## 1. Optional Map Data Caching

To optimize performance and reduce network traffic, the UI implements a persistent client-side cache using IndexedDB.

### Configuration
A new setting has been added to the IDE core configuration:
- **Key**: `map.enableCaching`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enables or disables persistent storage for terrain tiles in the browser.

### Components
- **TerrainCache**: Manages the IndexedDB storage (`war-games-terrain`). It respects the `enabled` flag from the configuration.
- **MapDataPipeline**: The primary orchestrator for map data. It checks L1 (RAM), then L2 (TerrainCache), before falling back to L3 (Network).
- **MapExtension**: Reads the setting during activation and initializes the pipeline.

---

## 2. Theater Bundle Endpoint (`/api/v2/terrain/theater/bundle`)

The bundle endpoint is a high-performance batching mechanism used to fetch multiple QuadTree tiles in a single request.

### Purpose
Reduces network overhead by avoiding the "waterfall" of dozens of small tile requests when panning or zooming the map.

### Data Flow
1.  **Client (`MapDataPipeline`)**: Accumulates tile requests for 300ms and sends a `POST` request with a list of `{z, x, y}` coordinates.
2.  **Server (`TheaterBundlerService`)**: Fetches all requested tiles in parallel from the `QuadTreeBaker`.
3.  **Baking (`QuadTreeBaker`)**: If a tile is not in the server's cache (`spatial_storage`), the baker samples raw 1x1 degree SRTM data (`terrain_raw`) and re-projects it into a 256x256 Mercator grid.
4.  **Packing**: The tiles are serialized into a single binary bundle using the `TheaterBundleFormat`.

### Binary Layout (`TBUN`)
The bundle uses a custom binary format optimized for fast parsing:
- **Header (12 bytes)**: Magic number `TBUN`, Version, and Tile Count.
- **Table of Contents (20 bytes per tile)**: Z, X, Y, Buffer Offset, and Data Length.
- **Payload**: Concatenated raw `WGTv2` tiles (~128KB per tile).

---

## 3. "Zero-Install" & JIT Architecture

To achieve an instant-on experience without requiring a 200GB local dataset, the system uses a progressive JIT (Just-In-Time) streaming model.

### Phase A: The Base Globe
- **Concept**: A pre-baked set of low-resolution tiles (Zoom 0 through 5) is shipped directly with the application (approx. 10MB–100MB).
- **Behavior**: The user sees a complete, low-poly 3D globe immediately upon boot. No network requests are required for global visibility.

### Phase B: The JIT Illusion (Upsampling)
- **Concept**: When a user zooms into an area where high-resolution source data is not yet downloaded, the `QuadTreeBaker` mathematically "stretches" (upsamples) the Base Globe data to fit the target zoom level.
- **Behavior**: The UI renders a blurry but functional terrain model instantly. There are no "Loading" spinners or empty holes in the map.

### Phase C: Background Harvesting & The "Snap"
- **Trigger**: The request for a blurry tile triggers a background prioritized task in the `HarvesterService`.
- **Download**: The server fetches the precise 30-meter `.hgt` file from AWS (~3MB compressed) and saves it to `terrain_raw`.
- **The Snap**: Once the high-res file arrives, the server sends a WebSocket/SSE notification to the UI. The `MapDataPipeline` clears its local cache for that area, and the blurry terrain instantly "snaps" into high-resolution tactical geometry.

### Phase D: Math Oracle Fallback
- **Concept**: Server-side simulation tools (LOS, Pathfinding) use the Base Globe as a fallback if high-res data hasn't arrived yet.
- **Behavior**: The simulation continues to run at 60fps with "good enough" data instead of blocking or crashing while waiting for I/O.

---

## 4. Performance & Storage Analysis

### Payload Size
A typical 1.1 MB bundle contains exactly **9 tiles**. 
- $9 \times 131,104 \text{ bytes} \approx 1.1 \text{ MB}$.
- 9 tiles represent a standard 3x3 grid used to fill a tactical viewport.

### Storage Discrepancy
- **Raw Terrain Data (`data/terrain_raw`)**: ~3.7 GB (in current environment). This is the source elevation data.
- **Baked Tile Cache (`data/spatial_storage`)**: ~17 GB. This is larger because the QuadTree tiling system generates many unique tiles at multiple zoom levels for the same area. In a JIT model, this cache grows only for the areas the user actually visits.

---

## 5. Implementation Roadmap

This checklist tracks the technical milestones for the Zero-Install / JIT architecture.

- [x] **Optional Map Caching**: UI toggle to enable/disable IndexedDB persistent storage.
- [ ] **Base Globe Generation**: Script to pre-bake Zoom Levels 0 through 5 for the entire planet (~10MB–50MB dataset).
- [ ] **JIT Upsampling Logic**: Update `QuadTreeBaker` to recursively upsample lower-zoom tiles when high-res source data is missing.
- [ ] **On-Demand Harvesting**: Wire `TerrainService` to trigger `HarvesterService` downloads based on active UI requests.
- [ ] **Real-Time "Snap" Events**: Implement SSE notifications (`TerrainUpdated`) to tell the UI to re-fetch newly baked high-res tiles.
- [ ] **Math Oracle Fallback**: Update elevation query tools (LOS, Pathfinding) to use best-available data from the Base Globe instead of returning `null`.

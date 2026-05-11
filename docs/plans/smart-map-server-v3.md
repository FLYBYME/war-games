# Implementation Plan: Dedicated Smart Map Server (V3)

This plan outlines the transformation of the terrain worker node into a professional-grade GIS (Geographic Information System) server. The core philosophy is to decouple data consumption from data ingestion and minimize RAM usage through zero-copy disk access.

## Pillar 1: The Optimized Storage Layer (MBTiles)
Managing millions of `.wgt` or `.hgt` files on the filesystem is inefficient. We will migrate to an **SQLite-backed MBTiles** structure for visual tiles and a **Raw Binary Blob** format for high-res elevation data.

- **SQLite Store**: Store pre-baked QuadTree tiles (visuals) in an SQLite database. This allows for near-instant indexing and 0ms disk lookups via `better-sqlite3`.
- **Pre-Processed Blobs**: Raw elevation data will be stored as uncompressed 16-bit integer grids (2 bytes per sample).

## Pillar 2: The "Zero-Wait" API (Asynchronous Harvesting)
The API must **never** wait for an external network call (AWS).

1. **Request Flow**:
   - Check SQLite/Disk Cache.
   - **Cache Hit**: Return data immediately (2-10ms).
   - **Cache Miss**: 
     - Return a **Level 0 (Low-Res) Fallback** or a generic "Ocean/Flat" tile.
     - Emit a `HARVEST_REQUEST` event to the `HarvesterService` queue.
2. **Harvester Priority**:
   - The Harvester background loop will prioritize tiles that have been requested by the API over global background crawling.

## Pillar 3: Zero-Copy Byte Range Reads
To support high-frequency simulation queries (LOS/Elevation) without RAM bloat, we will implement direct disk plucking.

- **Calculation**: Since SRTM/Geodetic data is a strict grid, the offset for any `(lat, lon)` can be calculated mathematically.
- **Implementation**: Use Node's `fs.openSync` and `fs.readSync` to read exactly 2 bytes from the SSD at the calculated offset.
- **Performance**: This allows the server to handle 10,000+ elevation queries per second using less than 50MB of RAM.

## Pillar 4: The Math Oracle
Expand the worker's capabilities beyond simple serving to complex spatial answers:
- `/api/v2/env/math/los`: 3D raycasting against disk-mapped terrain.
- `/api/v2/env/math/ground_clamp`: Batch snapping of unit positions to the terrain.
- `/api/v2/env/math/profile`: High-res elevation cross-sections for radar/comms analysis.

## Proposed Components

### 1. `SpatialDatabase.ts`
Manages the SQLite connection and provides a clean API for tile retrieval and insertion.

### 2. `ZeroCopyElevationService.ts`
Specialized service for plucking samples from binary blobs using file descriptors and offsets.

### 3. `PriorityHarvester.ts`
Replaces the current Harvester with a dual-queue system (User-Requested Priority vs. Global Background).

## Verification Strategy
- **RAM Benchmarking**: Monitor RSS memory while performing 10k random elevation queries.
- **Latency Benchmarking**: Ensure API response time for `bundle` requests is < 15ms (on cache hit) regardless of load.
- **Stall Testing**: Simulate a slow AWS connection and verify that the API returns fallbacks instantly instead of hanging.

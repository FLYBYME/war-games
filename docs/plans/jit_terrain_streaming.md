# JIT Terrain Streaming & Base Globe Fallback

This plan implements a progressive terrain loading system that ensures instant global playability while high-resolution data downloads in the background.

## Proposed Changes

### Core Services

#### [MODIFY] [TerrainService.ts](file:///home/ubuntu/code/war-games/src/server_v2/services/TerrainService.ts)
- Update `getTile` to attempt a low-resolution fallback (`res=32`) if the high-resolution (`res=1201`) data is missing from disk.
- When falling back, trigger a priority harvest request for the high-res data.

#### [MODIFY] [HarvesterService.ts](file:///home/ubuntu/code/war-games/src/server_v2/services/HarvesterService.ts)
- Add a `priorityQueue` to store coordinates that need immediate downloading.
- Update the crawl loop to check the priority queue before the standard North-to-South sweep.

### Scripts & Utilities

#### [NEW] [bake_base_globe.ts](file:///home/ubuntu/code/war-games/src/server_v2/scripts/bake_base_globe.ts)
- A utility script that iterates through all 64,800 global 1x1 degree squares and generates a 32x32 resolution "Base" tile for each.
- These tiles are saved to the `degree_tiles` table in `SpatialDatabase`.

## Verification Plan

### Automated Tests
- Create a new test `src/tests/v2/terrain/JITStreaming.test.ts` to verify:
    1. `TerrainService` returns a low-res tile when high-res is missing.
    2. `HarvesterService` prioritizes requested coordinates.

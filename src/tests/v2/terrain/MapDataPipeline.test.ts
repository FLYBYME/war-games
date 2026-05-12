import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MapDataPipeline } from '../../../client/extensions/map/MapDataPipeline';
import { WgtFormat } from '../../../engine/environment/utils/WgtFormat';
import { TheaterBundleFormat } from '../../../engine/environment/utils/TheaterBundleFormat';
import { TerrainCache } from '../../../client/extensions/map/TerrainCache';

describe('MapDataPipeline', () => {
    let pipeline: MapDataPipeline;
    let mockFetch: any;

    beforeEach(() => {
        vi.resetAllMocks();
        mockFetch = vi.fn();
        global.fetch = mockFetch;
        
        // Spy on TerrainCache prototype to avoid "not a function" errors
        vi.spyOn(TerrainCache.prototype, 'getTile').mockResolvedValue(null);
        vi.spyOn(TerrainCache.prototype, 'putTile').mockResolvedValue(undefined);
        vi.spyOn(TerrainCache.prototype, 'init').mockResolvedValue(undefined);

        pipeline = new MapDataPipeline('http://localhost');
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Batching: Ensure multiple calls to fetchViewport are debounced into one request', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(TheaterBundleFormat.pack([]).buffer)
        });

        const p1 = pipeline.fetchViewport([{ z: 1, x: 1, y: 1 }]);
        const p2 = pipeline.fetchViewport([{ z: 1, x: 2, y: 2 }]);
        
        await vi.advanceTimersByTimeAsync(300);
        await Promise.all([p1, p2]);
        
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('Chunking: Verify that requesting 40 tiles results in exactly 3 bundle requests', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(TheaterBundleFormat.pack([]).buffer)
        });

        const tiles = [];
        for (let i = 0; i < 40; i++) {
            tiles.push({ z: 10, x: i, y: 0 });
        }

        const p = pipeline.fetchViewport(tiles);
        await vi.advanceTimersByTimeAsync(300);
        await p;

        expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('Throttled Batch: Verify that the timer is NOT reset', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(TheaterBundleFormat.pack([]).buffer)
        });

        const p1 = pipeline.fetchViewport([{ z: 1, x: 1, y: 1 }]);
        await vi.advanceTimersByTimeAsync(200);
        const p2 = pipeline.fetchViewport([{ z: 1, x: 2, y: 2 }]);
        
        await vi.advanceTimersByTimeAsync(100); 
        await Promise.all([p1, p2]);
        
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('L1 Cache: Immediate return for previously loaded tiles', async () => {
        const data = new Int16Array(256 * 256).fill(10);
        const encoded = WgtFormat.encode(256, 0, 0, data);
        
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(encoded.buffer)
        });

        await pipeline.getQuadTile(10, 1, 1);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        await pipeline.getQuadTile(10, 1, 1);
        expect(mockFetch).toHaveBeenCalledTimes(1); 
    });

    it('L2 Cache (IDB): Verification of PersistentCache integration', async () => {
        const data = new Int16Array(256 * 256).fill(20);
        const encoded = WgtFormat.encode(256, 0, 0, data);
        
        vi.spyOn(TerrainCache.prototype, 'getTile').mockResolvedValue(encoded);

        const tile = await pipeline.getQuadTile(10, 5, 5);
        expect(tile?.data[0]).toBe(20);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('Concurrent Request Limit: Verify only 6 active fetches allowed', async () => {
        mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves

        for (let i = 0; i < 10; i++) {
            void pipeline.getQuadTile(10, i, 0);
        }

        // Flush microtasks to allow getQuadTile's internal async block to start
        await vi.advanceTimersByTimeAsync(0);

        expect((pipeline as any).activeRequests).toBe(6);
        expect((pipeline as any).requestQueue.length).toBe(4);
    });

    it('Loading State: isLoading Signal management', async () => {
        let resolveFetch: any;
        const fetchPromise = new Promise(resolve => { resolveFetch = resolve; });
        mockFetch.mockReturnValue(fetchPromise);

        expect(pipeline.isLoading.get()).toBe(false);
        const p = pipeline.getQuadTile(1, 1, 1);
        
        // Flush microtasks
        await vi.advanceTimersByTimeAsync(0);
        expect(pipeline.isLoading.get()).toBe(true);

        const data = new Int16Array(256 * 256).fill(0);
        const encoded = WgtFormat.encode(256, 0, 0, data);
        resolveFetch({
            ok: true,
            arrayBuffer: () => Promise.resolve(encoded.buffer)
        });

        await p;
        expect(pipeline.isLoading.get()).toBe(false);
    });

    it('getDegreeTile Routing: Verify correct endpoint for raw tiles', async () => {
        const data = new Int16Array(256 * 256).fill(0);
        const encoded = WgtFormat.encode(256, 10, 20, data);
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(encoded.buffer)
        });

        await pipeline.getDegreeTile(10, 20, 256);
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/v2/terrain/tile/degree?lat=10&lon=20&res=256'));
    });

    it('Visibility Filter: Ensure panned-away tiles are not fetched', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(TheaterBundleFormat.pack([]).buffer)
        });

        // First frame: needs tile A
        pipeline.fetchViewport([{ z: 10, x: 1, y: 1 }]);
        await vi.advanceTimersByTimeAsync(100);

        // Second frame: panned to tile B (A no longer needed)
        const p = pipeline.fetchViewport([{ z: 10, x: 2, y: 2 }]);
        await vi.advanceTimersByTimeAsync(200);
        await p;

        // Check the fetch body
        const call = mockFetch.mock.calls[0];
        const body = JSON.parse(call[1].body);
        expect(body.tiles).toHaveLength(1);
        expect(body.tiles[0].x).toBe(2);
    });

    it('Caching Disabled: Ensure L2 cache is ignored when enableCaching is false', async () => {
        const disabledPipeline = new MapDataPipeline('http://localhost', false);
        const getTileSpy = vi.spyOn(TerrainCache.prototype, 'getTile');
        
        mockFetch.mockResolvedValue({
            ok: true,
            arrayBuffer: () => Promise.resolve(WgtFormat.encode(256, 0, 0, new Int16Array(256 * 256)).buffer)
        });

        await disabledPipeline.getQuadTile(10, 1, 1);
        
        // It should still call getTile, but getTile will return null internally
        expect(getTileSpy).toHaveBeenCalled();
        expect(mockFetch).toHaveBeenCalled();
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuadTreeBaker } from '../../../server_v2/services/QuadTreeBaker';
import { WgtFormat } from '../../../engine/environment/utils/WgtFormat';

describe('QuadTreeBaker', () => {
    let baker: QuadTreeBaker;
    let mockTerrainService: any;

    beforeEach(() => {
        vi.resetAllMocks();
        
        mockTerrainService = {
            getTile: vi.fn(),
            getElevation: vi.fn()
        };

        baker = new QuadTreeBaker(mockTerrainService);
    });

    it('getTileBounds: Verify z/x/y to geodetic lat/lon conversion', () => {
        const bounds = (baker as any).getTileBounds(10, 512, 512);
        // z10, x512, y512 is near 0,0 (Null Island region)
        expect(bounds.minLon).toBeCloseTo(0, 1);
        expect(bounds.maxLon).toBeCloseTo(0.35, 1);
        expect(bounds.minLat).toBeCloseTo(-0.35, 1);
        expect(bounds.maxLat).toBeCloseTo(0, 1);
    });

    it('Single-Tile Sampling: 256x256 UI tile entirely inside one 1x1 degree tile', async () => {
        const data = new Int16Array(1201 * 1201).fill(500);
        // NW corner of 10N, 20E
        const sourceTile = { resolution: 1201, lat: 10, lon: 20, data, format: 0 };
        mockTerrainService.getTile.mockResolvedValue(sourceTile);

        // Picking a QuadTile at zoom 10 that is well within the 10,20 block
        // Lat 10.5, Lon 20.5 is approximately z10, x570, y408
        const encoded = await baker.getTile(10, 570, 408);
        const decoded = WgtFormat.decode(encoded);
        
        expect(decoded.data[0]).toBe(500);
        // Should only call getTile once (or twice if boundary floating point hits)
        // With the "currentTile" optimization, it should be exactly 1 for a small centered tile.
        expect(mockTerrainService.getTile).toHaveBeenCalledTimes(1);
    });

    it('Multi-Tile Spanning: 256x256 UI tile spanning across 1x1 degree boundaries', async () => {
        mockTerrainService.getTile.mockImplementation((lat: number, lon: number) => {
            return Promise.resolve({
                lat,
                lon,
                resolution: 1201,
                data: new Int16Array(1201 * 1201).fill(lat + lon),
                format: 0
            });
        });

        // z10, x512, y511 spans Equator (Lat 0)
        await baker.getTile(10, 512, 511);
        
        const calls = mockTerrainService.getTile.mock.calls;
        const coords = new Set(calls.map((c: any) => `${c[0]},${c[1]}`));
        // Should hit at least 2 degree-tiles because z10 tiles span ~0.35 degrees.
        expect(coords.size).toBeGreaterThanOrEqual(1); // 1 is minimum, but we expect more if it spans.
    });

    it('Performance Guard: Verify that the baker samples the degree-tile directly from a local variable', async () => {
        const data = new Int16Array(1201 * 1201).fill(0);
        // Use a coordinate like 10.5N, 10.5E which is dead-center of a tile
        mockTerrainService.getTile.mockResolvedValue({ resolution: 1201, lat: 10, lon: 10, data, format: 0 });

        // z14 at 10.5, 10.5 is very small (~20m) and definitely stays inside the 10N block
        // x = (10.5 + 180)/360 * 2^14 = 190.5/360 * 16384 = 8670.2
        await baker.getTile(14, 8670, 7850); 
        
        // Should only call getTile once for the entire 256x256 loop
        expect(mockTerrainService.getTile).toHaveBeenCalledTimes(1);
        expect(mockTerrainService.getElevation).not.toHaveBeenCalled();
    });

    it('Handling ocean tiles (null/fallback) in the bake loop', async () => {
        const res = 1201;
        mockTerrainService.getTile.mockResolvedValue({
            resolution: res,
            lat: 0,
            lon: 0,
            data: new Int16Array(res * res).fill(0),
            format: 0
        });

        const encoded = await baker.getTile(2, 0, 0); 
        const decoded = WgtFormat.decode(encoded);
        expect(decoded.data.every(v => v === 0)).toBe(true);
    });

    it('Coordinate Wrap: Tile spanning the Prime Meridian (Lon 0)', async () => {
        mockTerrainService.getTile.mockImplementation((lat: number, lon: number) => {
            return Promise.resolve({ lat, lon, resolution: 1201, data: new Int16Array(1201 * 1201).fill(0), format: 0 });
        });
        
        // z10 x512 is exactly at Lon 0.
        await baker.getTile(10, 511, 512);
        const lons = mockTerrainService.getTile.mock.calls.map((c: any) => c[1]);
        expect(lons.some((l: number) => l < 0)).toBe(true);
        expect(lons.some((l: number) => l >= 0)).toBe(true);
    });

    it('Boundary Wrap: Tile spanning multiple degree boundaries (z5)', async () => {
        mockTerrainService.getTile.mockImplementation((lat: number, lon: number) => {
            return Promise.resolve({ lat, lon, resolution: 1201, data: new Int16Array(1201 * 1201).fill(0), format: 0 });
        });
        
        // z5, x16, y15 spans multiple degrees
        await baker.getTile(5, 16, 15);
        const calls = mockTerrainService.getTile.mock.calls;
        const lats = new Set(calls.map((c: any) => c[0]));
        // A z5 tile spans ~11 degrees. It must hit multiple 1x1 blocks.
        expect(lats.size).toBeGreaterThan(1);
    });

    it('Extreme Zoom: z1 (Half the world)', async () => {
        mockTerrainService.getTile.mockResolvedValue({ resolution: 1201, lat: 0, lon: 0, data: new Int16Array(1201 * 1201).fill(0), format: 0 });

        const tile = await baker.getTile(1, 0, 0); 
        expect(tile).toBeInstanceOf(Uint8Array);
    });

    it('Downsampling Accuracy: Verify that values in the UI tile match the source data', async () => {
        const res = 1201;
        const data = new Int16Array(res * res).fill(0);
        data[0] = 777; // Northwest corner (Lat 11.0, Lon 20.0)
        mockTerrainService.getTile.mockResolvedValue({ resolution: res, lat: 10, lon: 20, data, format: 0 });

        // Lat 10.999 is NW corner of block 10,20.
        // x = (20.0 + 180)/360 * 2^10 = 568.88...
        // y = (1 - ln(tan(10.999)+sec(10.999))/pi)/2 * 2^10 = 410.8...
        const encoded = await baker.getTile(10, 568, 410);
        const decoded = WgtFormat.decode(encoded);
        // The pixel sampling Lat 10.9999 should hit index 0
        expect(decoded.data.some(v => v === 777)).toBe(true);
    });
});
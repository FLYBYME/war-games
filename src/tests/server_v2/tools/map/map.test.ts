import { describe, it, expect, vi, beforeEach } from 'vitest';
import { map_calculate_distance } from '../../../../server_v2/tools/map/map_calculate_distance.js';
import { map_convert } from '../../../../server_v2/tools/map/map_convert.js';
import { map_get_los } from '../../../../server_v2/tools/map/map_get_los.js';
import { map_get_elevation_profile } from '../../../../server_v2/tools/map/map_get_elevation_profile.js';
import { createMockMatchHandle, createMockMatchService, createMockContext } from '../../utils/mock_factory.js';

// Mock MatchService to return our mock handle
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Map Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('map_calculate_distance', () => {
        it('should calculate distance and bearing between two LLA points', async () => {
            const ctx = createMockContext(createMockMatchService());
            
            const p1 = { lat: 39, lon: 108, alt: 0 };
            const p2 = { lat: 40, lon: 109, alt: 0 };

            const result = await map_calculate_distance.call({ from: p1, to: p2 }, ctx);

            expect(result.distanceM).toBeGreaterThan(100000);
            expect(result.bearingDeg).toBeGreaterThan(0);
            expect(result.distanceNM).toBe(result.distanceM / 1852);
        });
    });

    describe('map_convert', () => {
        it('should convert LLA to ECEF', async () => {
            const ctx = createMockContext(createMockMatchService());
            
            const lla = { lat: 39, lon: 108, alt: 1000 };
            const result = await map_convert.call({ from: 'LLA', to: 'ECEF', position: lla }, ctx);

            expect(result.position.x).toBeDefined();
            expect(result.position.y).toBeDefined();
            expect(result.position.z).toBeDefined();
        });

        it('should convert LLA to ENU with origin', async () => {
            const ctx = createMockContext(createMockMatchService());
            
            const origin = { lat: 39, lon: 108, alt: 0 };
            const lla = { lat: 39.1, lon: 108.1, alt: 1000 };

            const result = await map_convert.call({ 
                from: 'LLA', 
                to: 'ENU', 
                position: lla, 
                origin 
            }, ctx);

            expect(result.position.x).toBeGreaterThan(0);
            expect(result.position.y).toBeGreaterThan(0);
        });
    });

    describe('map_get_los', () => {
        it('should calculate LOS between two points', async () => {
            const handle = createMockMatchHandle();
            // Mock projection
            const projection = {
                project: vi.fn(() => ({ lat: 39, lon: 108, alt: 0 }))
            };
            const envSystem = {
                getProjection: vi.fn(() => projection)
            };
            (handle as any).world.getSystem = vi.fn(() => envSystem);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            // Mock terrain service to return flat ground
            vi.spyOn(ctx.app.terrainService, 'getElevationProfile').mockResolvedValue([0, 0, 0, 0, 0]);

            const result = await map_get_los.call({
                matchId: handle.id,
                from: { x: 0, y: 0, z: 100 },
                to: { x: 1000, y: 1000, z: 100 }
            }, ctx);

            expect(result.hasLOS).toBe(true);
            expect(result.distanceM).toBeGreaterThan(0);
        });

        it('should detect obstruction', async () => {
            const handle = createMockMatchHandle();
            const projection = {
                project: vi.fn(() => ({ lat: 39, lon: 108, alt: 0 }))
            };
            const envSystem = {
                getProjection: vi.fn(() => projection)
            };
            (handle as any).world.getSystem = vi.fn(() => envSystem);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            // Mock terrain service to return a mountain in the middle
            vi.spyOn(ctx.app.terrainService, 'getElevationProfile').mockResolvedValue([0, 0, 500, 0, 0]);

            const result = await map_get_los.call({
                matchId: handle.id,
                from: { x: 0, y: 0, z: 100 },
                to: { x: 1000, y: 1000, z: 100 }
            }, ctx);

            expect(result.hasLOS).toBe(false);
            expect(result.terrainMaskPoints).toHaveLength(1);
        });
    });

    describe('Tactical Zones', () => {
        it('should create, list and update zones', async () => {
            const handle = createMockMatchHandle();
            (handle as any).zones = new Map();
            
            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const { map_create_zone } = await import('../../../../server_v2/tools/map/map_create_zone.js');
            const { map_list_zones } = await import('../../../../server_v2/tools/map/map_list_zones.js');
            const { map_update_zone } = await import('../../../../server_v2/tools/map/map_update_zone.js');

            const z1 = await map_create_zone.call({
                matchId: handle.id,
                name: 'NFZ Alpha',
                type: 'NFZ',
                points: [{ x: 0, y: 0, z: 0 }, { x: 100, y: 100, z: 0 }]
            }, ctx);

            expect(z1.id).toBeDefined();
            expect((handle as any).zones.size).toBe(1);

            const result = await map_list_zones.call({ matchId: handle.id }, ctx);
            expect(result.zones).toHaveLength(1);

            const updated = await map_update_zone.call({
                matchId: handle.id,
                zoneId: z1.id,
                name: 'Updated Name'
            }, ctx);

            expect(updated.name).toBe('Updated Name');
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env_get } from './env_get.js';
import { env_update } from './env_update.js';
import { env_sample_ocean } from './env_sample_ocean.js';
import { env_set_time } from './env_set_time.js';
import { createMockMatchHandle, createMockMatchService, createMockContext } from '../../test_utils/mock_factory.js';
import { EnvironmentSystem } from '../../../engine/systems/EnvironmentSystem.js';

// Mock MatchService to return our mock handle
vi.mock('../../services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Environment Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('env_get', () => {
        it('should return the current environment state', async () => {
            const handle = createMockMatchHandle();
            const envSystem = {
                globalWeather: {
                    precipitationRateMMhr: 5,
                    cloudCover: 0.5,
                    seaState: 4,
                    windSpeedKts: 20,
                    windDirDeg: 180,
                    visibilityNM: 10,
                    temperatureC: 20
                }
            };
            (handle as any).world.getSystem = vi.fn(() => envSystem);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await env_get.call({ matchId: handle.id }, ctx);

            expect(result.weather.windSpeedKts).toBe(20);
            expect(result.weather.temperatureC).toBe(20);
            expect(result.oceanography.seaState).toBe(4);
        });
    });

    describe('env_update', () => {
        it('should update the environment state', async () => {
            const handle = createMockMatchHandle();
            const envSystem = {
                globalWeather: {
                    precipitationRateMMhr: 0,
                    cloudCover: 0,
                    seaState: 0,
                    windSpeedKts: 0,
                    windDirDeg: 0,
                    visibilityNM: 20,
                    temperatureC: 15
                }
            };
            (handle as any).world.getSystem = vi.fn(() => envSystem);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await env_update.call({
                matchId: handle.id,
                windSpeedKts: 50,
                temperatureC: 30
            }, ctx);

            expect(envSystem.globalWeather.windSpeedKts).toBe(50);
            expect(envSystem.globalWeather.temperatureC).toBe(30);
            expect(result.weather.windSpeedKts).toBe(50);
        });
    });

    describe('env_sample_ocean', () => {
        it('should return sound speed for a given depth', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);

            const result = await env_sample_ocean.call({
                matchId: 'm1',
                position: { x: 0, y: 0, z: 0 },
                depthM: 500
            }, ctx);

            expect(result.soundSpeedMPS).toBeGreaterThan(1400);
            expect(result.temperatureC).toBeLessThan(15);
            expect(result.isAboveLayer).toBe(false);
        });
    });

    describe('env_set_time', () => {
        it('should calculate sun elevation correctly', async () => {
            const handle = createMockMatchHandle();
            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const noon = await env_set_time.call({ matchId: handle.id, hours: 12 }, ctx);
            expect(noon.sunElevationDeg).toBeCloseTo(90, 0);

            const midnight = await env_set_time.call({ matchId: handle.id, hours: 0 }, ctx);
            expect(midnight.sunElevationDeg).toBe(0);
        });
    });
});

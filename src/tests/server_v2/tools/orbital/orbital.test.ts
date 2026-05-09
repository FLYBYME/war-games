import { describe, it, expect, vi, beforeEach } from 'vitest';
import { orbital_get_elements } from '../../../../server_v2/tools/orbital/orbital_get_elements.js';
import { orbital_update_elements } from '../../../../server_v2/tools/orbital/orbital_update_elements.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { OrbitalComponent } from '../../../../engine/components/Orbital.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Orbital Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('orbital_get_elements', () => {
        it('should return orbital elements of a satellite', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('sat1');
            const orb = new OrbitalComponent(600, 45, 90, 0, 100);
            entity.getComponent = vi.fn(() => orb);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await orbital_get_elements.call({ matchId: handle.id, entityId: 'sat1' }, ctx);

            expect(result.inclinationDeg).toBe(45);
            expect(result.epochTick).toBe(100);
        });
    });

    describe('orbital_update_elements', () => {
        it('should update orbital parameters', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('sat1');
            const orb = new OrbitalComponent();
            entity.getComponent = vi.fn(() => orb);
            (handle as any).world.getEntity = vi.fn(() => entity);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await orbital_update_elements.call({
                matchId: handle.id,
                entityId: 'sat1',
                inclinationDeg: 60
            }, ctx);

            expect(orb.inclinationDeg).toBe(60);
            expect(result.inclinationDeg).toBe(60);
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { track_list } from '../../../../server_v2/tools/track/track_list.js';
import { track_get } from '../../../../server_v2/tools/track/track_get.js';
import { track_update } from '../../../../server_v2/tools/track/track_update.js';
import { track_delete } from '../../../../server_v2/tools/track/track_delete.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { TrackComponent } from '../../../../engine/components/Track.js';
import { TrackStatus, IdentificationStatus } from '../../../../engine/core/Types.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Track Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('track_list', () => {
        it('should list all fused tracks for a side', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1', 'Blue');
            const trackComp = new TrackComponent();
            const track = {
                id: 'TRK-001',
                trueEntityId: 'target-1',
                position: { x: 1000, y: 1000, z: 0 },
                velocity: { x: 0, y: 0, z: 0 },
                status: TrackStatus.Active,
                classification: 'Ship',
                identification: IdentificationStatus.HOSTILE,
                confidence: 1.0,
                firstSeenTick: 0,
                lastSeenTick: 0,
                cepM: 10
            };
            trackComp.tracks.set(track.id, track);
            entity.getComponent = vi.fn((ctor: any) => ctor.name === 'TrackComponent' ? trackComp : null);
            
            (handle as any).world.getEntities = vi.fn(() => [entity]);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await track_list.call({ matchId: handle.id, side: 'Blue' }, ctx);

            expect(result.totalCount).toBe(1);
            expect(result.tracks[0].id).toBe('TRK-001');
        });
    });

    describe('track_update', () => {
        it('should update track classification', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1', 'Blue');
            const trackComp = new TrackComponent();
            const track = { id: 'TRK-001', classification: 'Unknown' } as any;
            trackComp.tracks.set(track.id, track);
            entity.getComponent = vi.fn((ctor: any) => ctor.name === 'TrackComponent' ? trackComp : null);
            
            (handle as any).world.getEntities = vi.fn(() => [entity]);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await track_update.call({
                matchId: handle.id,
                trackId: 'TRK-001',
                classification: 'Hostile Aircraft'
            }, ctx);

            expect(track.classification).toBe('Hostile Aircraft');
            expect(result.classification).toBe('Hostile Aircraft');
        });
    });

    describe('track_delete', () => {
        it('should remove a track', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1', 'Blue');
            const trackComp = new TrackComponent();
            trackComp.tracks.set('TRK-001', {} as any);
            entity.getComponent = vi.fn((ctor: any) => ctor.name === 'TrackComponent' ? trackComp : null);
            
            (handle as any).world.getEntities = vi.fn(() => [entity]);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await track_delete.call({
                matchId: handle.id,
                trackId: 'TRK-001'
            }, ctx);

            expect(result.success).toBe(true);
            expect(trackComp.tracks.has('TRK-001')).toBe(false);
        });
    });
});

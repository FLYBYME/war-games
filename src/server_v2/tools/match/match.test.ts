import { describe, it, expect, vi, beforeEach } from 'vitest';
import { match_list } from './match_list.js';
import { match_get } from './match_get.js';
import { match_create } from './match_create.js';
import { match_delete } from './match_delete.js';
import { match_update } from './match_update.js';
import { createMockMatchHandle, createMockMatchService, createMockContext } from '../../test_utils/mock_factory.js';

// Mock the MatchService module to override isMatchHandle
vi.mock('../../services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true) // Always return true for mocks in these tests
    };
});

describe('Match Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('match_list', () => {
        it('should list all active matches', async () => {
            const mockMatches = [
                createMockMatchHandle({ id: 'm1', name: 'Match 1' }),
                createMockMatchHandle({ id: 'm2', name: 'Match 2', isPaused: true })
            ];
            const matchService = createMockMatchService(mockMatches);
            const ctx = createMockContext(matchService);

            const result = await match_list.call({
                page: 1,
                pageSize: 20
            }, ctx);

            expect(result.totalCount).toBe(2);
            expect(result.matches[0].id).toBe('m1');
            expect(result.matches[0].status).toBe('running');
            expect(result.matches[1].id).toBe('m2');
            expect(result.matches[1].status).toBe('paused');
            expect(matchService.listMatches).toHaveBeenCalled();
        });
    });

    describe('match_get', () => {
        it('should return details for a specific match', async () => {
            const mockMatch = createMockMatchHandle({ id: 'm1', name: 'Match 1' });
            // Add mock world for scores
            (mockMatch as any).world = { stats: { blue: 10, red: 5, munitionsExpended: 2 } };
            
            const matchService = createMockMatchService([mockMatch]);
            const ctx = createMockContext(matchService);

            const result = await match_get.call({ matchId: 'm1' }, ctx);

            expect(result.id).toBe('m1');
            expect(result.name).toBe('Match 1');
            expect(result.score.blue).toBe(10);
            expect(matchService.getMatch).toHaveBeenCalledWith('m1');
        });

        it('should throw error if match is not found', async () => {
            const matchService = createMockMatchService([]);
            const ctx = createMockContext(matchService);

            await expect(match_get.call({ matchId: 'non-existent' }, ctx))
                .rejects.toThrow('Match not found');
        });
    });

    describe('match_create', () => {
        it('should create a new match', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);

            const result = await match_create.call({
                scenarioId: 'scen-1',
                name: 'New Test Match',
                maxTurns: 10000
            }, ctx);

            expect(result.name).toBe('New Test Match');
            expect(result.scenarioId).toBe('scen-1');
            expect(matchService.createMatch).toHaveBeenCalledWith('scen-1', 'New Test Match');
        });
    });

    describe('match_delete', () => {
        it('should delete a match', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);

            const result = await match_delete.call({ matchId: 'm1' }, ctx);

            expect(result.success).toBe(true);
            expect(matchService.deleteMatch).toHaveBeenCalledWith('m1');
        });
    });

    describe('match_update', () => {
        it('should update match parameters', async () => {
            const mockMatch = createMockMatchHandle({ id: 'm1', name: 'Original Name' });
            const matchService = createMockMatchService([mockMatch]);
            const ctx = createMockContext(matchService);

            const result = await match_update.call({
                matchId: 'm1',
                name: 'Updated Name',
                maxTurns: 5000
            }, ctx);

            expect(result.name).toBe('Updated Name');
            expect(result.maxTurns).toBe(5000);
            expect(matchService.getMatch).toHaveBeenCalledWith('m1');
        });
    });
});

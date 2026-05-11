import { describe, it, expect, vi, beforeEach } from 'vitest';
import { match_list } from '../../../../server_v2/tools/match/match_list.js';
import { match_get } from '../../../../server_v2/tools/match/match_get.js';
import { match_create } from '../../../../server_v2/tools/match/match_create.js';
import { match_delete } from '../../../../server_v2/tools/match/match_delete.js';
import { match_update } from '../../../../server_v2/tools/match/match_update.js';
import { match_get_win_state } from '../../../../server_v2/tools/match/match_get_win_state.js';
import { matchCreateContract } from '../../../../sdk_v2/contracts/index.js';
import { createMockMatchHandle, createMockMatchService, createMockContext } from '../../utils/mock_factory.js';

// Mock the MatchService module to override isMatchHandle
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true) // Always return true for mocks in these tests
    };
});

// Mock the database for tools that use it directly (like match_update)
vi.mock('../../../../server_v2/db/db.js', () => ({
    db: {
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn(() => ({
                    run: vi.fn()
                }))
            }))
        }))
    }
}));

vi.mock('../../../../server_v2/db/schema.js', () => ({
    matches: { id: 'id' }
}));

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

        it('should handle pagination', async () => {
            const matchService = createMockMatchService([]);
            const ctx = createMockContext(matchService);

            await match_list.call({
                page: 2,
                pageSize: 10
            }, ctx);

            expect(matchService.listMatches).toHaveBeenCalled();
        });

        it('should filter by status', async () => {
            const matchService = createMockMatchService([]);
            const ctx = createMockContext(matchService);

            await match_list.call({
                page: 1,
                pageSize: 20,
                status: 'running'
            }, ctx);

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

        it('should handle service errors gracefully', async () => {
            const matchService = createMockMatchService();
            (matchService.getMatch as any).mockImplementation(() => {
                throw new Error('Database connection failed');
            });
            const ctx = createMockContext(matchService);

            await expect(match_get.call({ matchId: 'm1' }, ctx))
                .rejects.toThrow('Database connection failed');
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


        it('should fail schema validation for empty scenarioId', () => {
            const input = {
                scenarioId: '',
                name: 'New Match'
            };
            expect(() => matchCreateContract.inputSchema.parse(input)).toThrow();
        });

        it('should fail schema validation for empty name', () => {
            const input = {
                scenarioId: 'scen-1',
                name: ''
            };
            expect(() => matchCreateContract.inputSchema.parse(input)).toThrow();
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
            
            const { db } = await import('../../../../server_v2/db/db.js');
            expect(db.update).toHaveBeenCalled();
        });

        it('should handle partial updates', async () => {
            const mockMatch = createMockMatchHandle({ id: 'm1', name: 'Original Name' });
            const matchService = createMockMatchService([mockMatch]);
            const ctx = createMockContext(matchService);

            const result = await match_update.call({
                matchId: 'm1',
                name: 'New Name'
                // maxTurns omitted
            }, ctx);

            expect(result.name).toBe('New Name');
            expect(result.maxTurns).toBe(10000); // Default
        });
    });

    describe('match_get_win_state', () => {
        it('should return win state for a match', async () => {
            const handle = createMockMatchHandle();
            handle.world.stats.red = 15; // Trigger blue victory
            handle.world.stats.blue = 0;
            
            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await match_get_win_state.call({ matchId: handle.id }, ctx);

            expect(result.winType).toBe('blue_victory');
            expect(result.winReason).toContain('Red forces');
        });

        it('should return undetermined if no win condition met', async () => {
            const handle = createMockMatchHandle();
            handle.world.stats.red = 5;
            handle.world.stats.blue = 5;
            
            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await match_get_win_state.call({ matchId: handle.id }, ctx);

            expect(result.winType).toBe('undetermined');
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WarGamesClientV2 } from '../../sdk_v2/generated/WarGamesClientV2';

describe('V2 API & SDK Unit Tests (Tests 221-240)', () => {
    let client: WarGamesClientV2;

    beforeEach(() => {
        client = new WarGamesClientV2('http://localhost:3000');
        // Mock global fetch
        global.fetch = vi.fn();
    });

    it('should fetch match state via SDK (Test 221)', async () => {
        const mockMatch = {
            id: 'match-123',
            name: 'Test Match',
            status: 'running',
            currentTick: 100
        };

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockMatch
        });

        const result = await client.api.match.get({ matchId: 'match-123' });

        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:3000/matches/match-123?matchId=match-123',
            expect.objectContaining({ method: 'GET' })
        );
        expect(result).toEqual(mockMatch);
    });

    it('should send fire command via SDK (Test 222)', async () => {
        const mockResponse = { success: true };

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockResponse
        });

        const args = {
            matchId: 'match-123',
            entityId: 'shooter-1',
            mountIndex: 0,
            targetId: 'target-1'
        };

        const result = await client.api.combat.fire(args);

        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:3000/matches/match-123/entities/shooter-1/combat/fire',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(args)
            })
        );
        expect(result).toEqual(mockResponse);
    });

    it('should handle request failures gracefully (Test 225)', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            status: 404,
            text: async () => 'Match not found'
        });

        await expect(client.api.match.get({ matchId: 'invalid' }))
            .rejects.toThrow('Request failed: 404 - Match not found');
    });

    it('should correctly format GET query parameters (Test 230)', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ entities: [] })
        });

        await client.api.entity.list({ matchId: 'match-123', side: 'Blue' as any });

        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:3000/matches/match-123/entities?matchId=match-123&side=Blue',
            expect.objectContaining({ method: 'GET' })
        );
    });
});

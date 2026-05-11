import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchService, MatchServiceEvents } from '../../../client/core/services/MatchService';

describe('MatchService', () => {
    let mockClient: any;
    let mockEmitter: any;
    let service: MatchService;

    beforeEach(() => {
        mockClient = {
            api: {
                match: {
                    get: vi.fn().mockResolvedValue({ id: 'm1', name: 'Match 1', status: 'running' }),
                }
            }
        };

        mockEmitter = {
            emit: vi.fn()
        };

        service = new MatchService(mockClient);
        service.setEmitter(mockEmitter);
    });

    it('should initialize with no active match', () => {
        expect(service.currentMatchId.get()).toBeNull();
        expect(service.currentMatch.get()).toBeNull();
    });

    it('should select a match and fetch its details', async () => {
        await service.selectMatch('m1');
        
        expect(service.currentMatchId.get()).toBe('m1');
        expect(mockClient.api.match.get).toHaveBeenCalledWith({ matchId: 'm1' });
        expect(service.currentMatch.get()?.name).toBe('Match 1');
        expect(mockEmitter.emit).toHaveBeenCalledWith(MatchServiceEvents.MATCH_ACTIVATED, expect.objectContaining({ matchId: 'm1' }));
    });

    it('should deactivate a match', () => {
        service.currentMatchId.set('m1');
        service.deactivate();
        
        expect(service.currentMatchId.get()).toBeNull();
        expect(service.currentMatch.get()).toBeNull();
        expect(mockEmitter.emit).toHaveBeenCalledWith(MatchServiceEvents.MATCH_DEACTIVATED, { matchId: 'm1' });
    });

    it('should set side', () => {
        service.setSide('blue');
        expect(service.currentSide.get()).toBe('blue');
    });
});

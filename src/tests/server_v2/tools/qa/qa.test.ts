import { describe, it, expect, vi, beforeEach } from 'vitest';
import { qa_test_weapon } from '../../../../server_v2/tools/qa/qa_test_weapon.js';
import { createMockMatchHandle, createMockMatchService, createMockContext } from '../../utils/mock_factory.js';

// Mock the sub-tools used by qa_test_weapon
vi.mock('../../../../server_v2/tools/entity/entity_create.js', () => ({
    entity_create: { call: vi.fn(async () => ({ id: 'mock-id', position: { x: 0, y: 0, z: 0 }, heading: 0, side: 'Blue' })) }
}));

vi.mock('../../../../server_v2/tools/combat/combat_fire.js', () => ({
    combat_fire: { call: vi.fn(async () => ({ success: true })) }
}));

vi.mock('../../../../server_v2/tools/sim/sim_step.js', () => ({
    sim_step: { call: vi.fn(async () => ({ currentTick: 10, timestamp: 1.0 })) }
}));

vi.mock('../../../../server_v2/tools/sensor/sensor_add_detection.js', () => ({
    sensor_add_detection: { call: vi.fn(async () => ({ success: true })) }
}));

vi.mock('../../../../server_v2/tools/history/history_get_entity_samples.js', () => ({
    history_get_entity_samples: { call: vi.fn(async () => ({ samples: [], totalCount: 0 })) }
}));

describe('QA Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('qa_test_weapon', () => {
        it('should execute a full weapon test cycle', async () => {
            const handle = createMockMatchHandle();
            (handle.world.weaponProfiles.get as any).mockReturnValue({
                id: 'aim-9x',
                name: 'AIM-9X',
                type: 'Missile'
            });
            (handle.world.weaponProfiles as any).getInternalMap = vi.fn(() => new Map());

            const matchService = createMockMatchService([handle]);
            (matchService.createMatch as any).mockResolvedValue(handle);
            const ctx = createMockContext(matchService);

            // Mock agent service
            (ctx.app.agentService.listAgents as any).mockResolvedValue([{ id: 'agent-1', name: 'Qa Analyst' }]);
            (ctx.app.agentService.createThread as any).mockResolvedValue({ id: 'thread-1' });
            
            // Mock async generator for agent stream
            (ctx.app.agentService.runAgentStream as any).mockImplementation(async function* () {
                yield { type: 'content', text: 'Analysis complete.' };
            });

            const input = {
                weaponProfileId: 'aim-9x',
                targetProfileId: 'f16',
                rangeM: 5000,
                altitudeM: 2000,
                rounds: 1,
                enableAnalysis: true
            };

            const result = await qa_test_weapon.call(input, ctx);

            expect(result.outcome).toBeDefined();
            expect(result.agentAnalysis).toContain('Analysis complete.');
            expect(ctx.app.matchService.createMatch).toHaveBeenCalled();
        });

        it('should throw error if QA Analyst agent is missing', async () => {
            const handle = createMockMatchHandle();
            (handle.world.weaponProfiles.get as any).mockReturnValue({ id: 'aim-9x' });
            (handle.world.weaponProfiles as any).getInternalMap = vi.fn(() => new Map());

            const matchService = createMockMatchService([handle]);
            (matchService.createMatch as any).mockResolvedValue(handle);
            const ctx = createMockContext(matchService);

            (ctx.app.agentService.listAgents as any).mockResolvedValue([]);

            const input = {
                weaponProfileId: 'aim-9x',
                targetProfileId: 'f16',
                rangeM: 5000,
                altitudeM: 2000,
                rounds: 1,
                enableAnalysis: true
            };

            await expect(qa_test_weapon.call(input, ctx)).rejects.toThrow('QA Analyst agent not found');
        });
    });
});

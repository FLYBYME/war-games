import { describe, it, expect, vi, beforeEach } from 'vitest';
import { agent_create } from '../../../../server_v2/tools/agent/agent_create.js';
import { agent_list } from '../../../../server_v2/tools/agent/agent_list.js';
import { agent_delete } from '../../../../server_v2/tools/agent/agent_delete.js';
import { createMockMatchService, createMockContext } from '../../utils/mock_factory.js';

describe('Agent Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('agent_create', () => {
        it('should call agentService.createAgent', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);
            const mockAgent = { id: 'agent-1', name: 'Test Agent' };
            (ctx.app.agentService.createAgent as any).mockResolvedValue(mockAgent);

            const input = { name: 'Test Agent', systemPrompt: 'You are a tester' };
            const result = await agent_create.call(input, ctx);

            expect(ctx.app.agentService.createAgent).toHaveBeenCalledWith(input);
            expect(result).toEqual(mockAgent);
        });
    });

    describe('agent_list', () => {
        it('should call agentService.listAgents', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);
            const mockAgents = [{ id: 'agent-1', name: 'Test Agent' }];
            (ctx.app.agentService.listAgents as any).mockResolvedValue(mockAgents);

            const result = await agent_list.call({}, ctx);

            expect(ctx.app.agentService.listAgents).toHaveBeenCalled();
            expect(result).toEqual(mockAgents);
        });
    });

    describe('agent_delete', () => {
        it('should call agentService.deleteAgent', async () => {
            const matchService = createMockMatchService();
            const ctx = createMockContext(matchService);
            (ctx.app.agentService as any).deleteAgent = vi.fn().mockResolvedValue(true);

            const input = { agentId: 'agent-1' };
            const result = await (agent_delete as any).call(input, ctx);

            expect((ctx.app.agentService as any).deleteAgent).toHaveBeenCalledWith('agent-1');
            expect(result.success).toBe(true);
        });
    });
});

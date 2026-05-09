import { describe, it, expect, vi, beforeEach } from 'vitest';
import { group_list } from '../../../../server_v2/tools/group/group_list.js';
import { group_create } from '../../../../server_v2/tools/group/group_create.js';
import { group_get } from '../../../../server_v2/tools/group/group_get.js';
import { group_set_leader } from '../../../../server_v2/tools/group/group_set_leader.js';
import { group_set_parameters } from '../../../../server_v2/tools/group/group_set_parameters.js';
import { createMockMatchHandle, createMockMatchService, createMockContext, createMockEntity } from '../../utils/mock_factory.js';
import { GroupComponent, GroupFormation } from '../../../../engine/components/Group.js';
import { SetIntentCommand } from '../../../../engine/core/Command.js';

// Mock MatchService
vi.mock('../../../../server_v2/services/MatchService.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        isMatchHandle: vi.fn(() => true)
    };
});

describe('Group Tools Unit Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('group_list', () => {
        it('should list all tactical groups in a match', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const groupComp = new GroupComponent({
                groupId: 'G1',
                leaderId: 'e1',
                memberIds: new Set(['e1', 'e2']),
                formation: GroupFormation.Wedge,
                spacingM: 1000
            });
            entity.getComponent = vi.fn(() => groupComp);
            (handle as any).world.getEntities = vi.fn(() => [entity]);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await group_list.call({ matchId: handle.id }, ctx);

            expect(result.groups).toHaveLength(1);
            expect(result.groups[0].groupId).toBe('G1');
            expect(result.groups[0].formation).toBe(GroupFormation.Wedge);
        });
    });

    describe('group_create', () => {
        it('should queue SetIntentCommand for group creation', async () => {
            const handle = createMockMatchHandle();
            (handle as any).world.queueExternalCommand = vi.fn();

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await group_create.call({
                matchId: handle.id,
                groupId: 'NEW-G',
                leaderId: 'e1',
                memberIds: ['e1', 'e2'],
                formation: 'Diamond' as any,
                spacingM: 500
            }, ctx);

            expect(result.groupId).toBe('NEW-G');
            expect((handle as any).world.queueExternalCommand).toHaveBeenCalledWith(expect.any(SetIntentCommand));
        });
    });

    describe('group_get', () => {
        it('should return a specific group by ID', async () => {
            const handle = createMockMatchHandle();
            const entity = createMockEntity('e1');
            const groupComp = new GroupComponent({ groupId: 'G1', leaderId: 'e1' });
            entity.getComponent = vi.fn(() => groupComp);
            (handle as any).world.getEntities = vi.fn(() => [entity]);

            const matchService = createMockMatchService([handle]);
            const ctx = createMockContext(matchService);

            const result = await group_get.call({ matchId: handle.id, groupId: 'G1' }, ctx);

            expect(result.groupId).toBe('G1');
        });
    });
});

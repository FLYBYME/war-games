import { defineTool } from '../../core/tool_builder.js';
import { groupCreateContract } from '../../../sdk_v2/contracts/index.js';
import { SetIntentCommand } from '../../../engine/core/Command.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const group_create = defineTool(groupCreateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    handle.world.queueExternalCommand(new SetIntentCommand({
        type: 'Group',
        groupId: input.groupId,
        leaderId: input.leaderId,
        members: input.memberIds,
        formationType: input.formation as any
    }));

    return {
        groupId: input.groupId,
        leaderId: input.leaderId,
        memberIds: input.memberIds,
        formation: input.formation as any || 'None',
        spacingM: input.spacingM || 500
    };
});

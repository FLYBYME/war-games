import { defineTool } from '../../core/tool_builder.js';
import { groupSetLeaderContract } from '../../../sdk_v2/contracts/index.js';
import { SetIntentCommand } from '../../../engine/core/Command.js';
import { GroupComponent } from '../../../engine/components/Group.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const group_set_leader = defineTool(groupSetLeaderContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    // Find the existing group to get its members and formation
    let existingGroup: any = null;
    for (const entity of handle.world.getEntities()) {
        const groupComp = entity.getComponent(GroupComponent);
        if (groupComp && groupComp.groupId === input.groupId) {
            existingGroup = groupComp;
            break;
        }
    }

    if (!existingGroup) throw new Error(`Group not found: ${input.groupId}`);

    handle.world.queueExternalCommand(new SetIntentCommand({
        type: 'Group',
        groupId: input.groupId,
        leaderId: input.leaderId,
        members: Array.from(existingGroup.memberIds),
        formationType: existingGroup.formation
    }));

    return {
        groupId: input.groupId,
        leaderId: input.leaderId,
        memberIds: Array.from(existingGroup.memberIds) as string[],
        formation: existingGroup.formation as any,
        spacingM: existingGroup.spacingM
    };
});

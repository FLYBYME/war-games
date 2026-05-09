import { defineTool } from '../../core/tool_builder.js';
import { groupListContract } from '../../../sdk_v2/contracts/index.js';
import { GroupComponent } from '../../../engine/components/Group.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const group_list = defineTool(groupListContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const groupsMap = new Map<string, any>();

    for (const entity of handle.world.getEntities()) {
        const groupComp = entity.getComponent(GroupComponent);
        if (groupComp && !groupsMap.has(groupComp.groupId)) {
            groupsMap.set(groupComp.groupId, {
                groupId: groupComp.groupId,
                leaderId: groupComp.leaderId,
                memberIds: Array.from(groupComp.memberIds),
                formation: groupComp.formation,
                spacingM: groupComp.spacingM
            });
        }
    }

    return {
        groups: Array.from(groupsMap.values())
    };
});

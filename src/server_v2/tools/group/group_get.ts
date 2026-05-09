import { defineTool } from '../../core/tool_builder.js';
import { groupGetContract } from '../../../sdk_v2/contracts/index.js';
import { GroupComponent } from '../../../engine/components/Group.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const group_get = defineTool(groupGetContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    for (const entity of handle.world.getEntities()) {
        const groupComp = entity.getComponent(GroupComponent);
        if (groupComp && groupComp.groupId === input.groupId) {
            return {
                groupId: groupComp.groupId,
                leaderId: groupComp.leaderId,
                memberIds: Array.from(groupComp.memberIds),
                formation: groupComp.formation as any,
                spacingM: groupComp.spacingM
            };
        }
    }

    throw new Error(`Group not found: ${input.groupId}`);
});

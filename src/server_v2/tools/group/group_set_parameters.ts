import { defineTool } from '../../core/tool_builder.js';
import { groupSetParametersContract } from '../../../sdk_v2/contracts/index.js';
import { SetIntentCommand } from '../../../engine/core/Command.js';
import { GroupComponent } from '../../../engine/components/Group.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const group_set_parameters = defineTool(groupSetParametersContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    let existingGroup: any = null;
    for (const entity of handle.world.getEntities()) {
        const groupComp = entity.getComponent(GroupComponent);
        if (groupComp && groupComp.groupId === input.groupId) {
            existingGroup = groupComp;
            break;
        }
    }

    if (!existingGroup) throw new Error(`Group not found: ${input.groupId}`);

    // Update spacing directly as it's an administrative parameter
    if (input.spacingM !== undefined) existingGroup.spacingM = input.spacingM;

    handle.world.queueExternalCommand(new SetIntentCommand({
        type: 'Group',
        groupId: input.groupId,
        leaderId: existingGroup.leaderId,
        members: Array.from(existingGroup.memberIds),
        formationType: (input.formation as any) || existingGroup.formation
    }));

    return {
        groupId: input.groupId,
        leaderId: existingGroup.leaderId,
        memberIds: Array.from(existingGroup.memberIds) as string[],
        formation: (input.formation as any) || existingGroup.formation,
        spacingM: existingGroup.spacingM
    };
});

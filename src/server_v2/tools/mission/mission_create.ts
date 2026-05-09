import { defineTool } from '../../core/tool_builder.js';
import { missionCreateContract } from '../../../sdk_v2/contracts/index.js';
import { SetMissionCommand } from '../../../engine/core/Command.js';
import { MissionComponent } from '../../../engine/components/Missions.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const mission_create = defineTool(missionCreateContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    handle.world.queueExternalCommand(new SetMissionCommand(
        input.entityId,
        input.missionType as any,
        input.params as any
    ));

    const mission = entity.getComponent(MissionComponent);

    return {
        type: (input.missionType as any) || mission?.missionType || 'Idle',
        status: (mission?.status as any) || 'Pending',
        params: input.params || mission?.params || {},
        startTimeTick: mission?.startTimeTick || handle.world.currentTick
    };
});

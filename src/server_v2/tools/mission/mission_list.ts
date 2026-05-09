import { defineTool } from '../../core/tool_builder.js';
import { missionListContract } from '../../../sdk_v2/contracts/index.js';
import { MissionComponent } from '../../../engine/components/Missions.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const mission_list = defineTool(missionListContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const mission = entity.getComponent(MissionComponent);

    return {
        missions: mission ? [{
            type: mission.missionType as any,
            status: mission.status as any,
            params: mission.params as any,
            startTimeTick: mission.startTimeTick
        }] : []
    };
});

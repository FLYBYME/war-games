import { defineTool } from '../../core/tool_builder.js';
import { ministryGetEvaluationContract } from '../../../sdk_v2/contracts/index.js';
import { MissionSystem } from '../../../engine/systems/MissionSystem.js';
import { MissionComponent } from '../../../engine/components/Missions.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const ministry_get_evaluation = defineTool(ministryGetEvaluationContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const missionSystem = handle.world.getSystem(MissionSystem);
    if (!missionSystem) throw new Error("MissionSystem not found in world");

    // Find the first unit on this side with an active mission to use as a proxy for the side's ministry evaluation
    const entities = Array.from(handle.world.getEntities());
    const proxy = entities.find(e => e.side === input.side && e.getComponent(MissionComponent));

    if (!proxy) {
        return {
            objectiveId: 'Idle',
            targetPosition: { x: 0, y: 0, z: 0 },
            priority: 0,
            resourceNeeds: []
        };
    }

    const mission = proxy.getComponent(MissionComponent)!;
    const evaluation = missionSystem.evaluateMinistry(proxy, mission, handle.world);

    return {
        objectiveId: evaluation.objectiveId,
        targetPosition: evaluation.targetPosition || { x: 0, y: 0, z: 0 },
        priority: 50, // Default priority
        resourceNeeds: Object.keys(evaluation.resourceNeeds || {})
    };
});

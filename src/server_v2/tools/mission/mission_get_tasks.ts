import { defineTool } from '../../core/tool_builder.js';
import { missionGetTasksContract } from '../../../sdk_v2/contracts/index.js';
import { TaskGraphComponent } from '../../../engine/components/TaskGraph.js';
import { isMatchHandle } from '../../services/MatchService.js';

export const mission_get_tasks = defineTool(missionGetTasksContract, async (input, ctx) => {
    const handle = ctx.app.matchService.getMatch(input.matchId);
    if (!isMatchHandle(handle)) throw new Error("Internal error: Handle is not a concrete MatchHandle");

    const entity = handle.world.getEntity(input.entityId);
    if (!entity) throw new Error(`Entity not found: ${input.entityId}`);

    const taskComp = entity.getComponent(TaskGraphComponent);

    return {
        tasks: taskComp ? Array.from(taskComp.graph.nodes.values()).map(node => ({
            id: node.id,
            type: node.task.type,
            status: node.status,
            dependencies: node.dependencies
        })) : []
    };
});

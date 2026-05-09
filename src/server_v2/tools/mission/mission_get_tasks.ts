import { defineTool } from '../../core/tool_builder.js';
import { missionGetTasksContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const mission_get_tasks = defineTool(missionGetTasksContract, async (input, ctx) => {
    // TODO: Implement mission get_tasks
    console.log("Executing mission_get_tasks", input);
    throw new Error("Not implemented");
});

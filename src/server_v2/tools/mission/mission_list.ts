import { defineTool } from '../../core/tool_builder.js';
import { missionListContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const mission_list = defineTool(missionListContract, async (input, ctx) => {
    // TODO: Implement mission list
    console.log("Executing mission_list", input);
    throw new Error("Not implemented");
});

import { defineTool } from '../../core/tool_builder.js';
import { groupListContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const group_list = defineTool(groupListContract, async (input, ctx) => {
    // TODO: Implement group list
    console.log("Executing group_list", input);
    throw new Error("Not implemented");
});

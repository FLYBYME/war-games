import { defineTool } from '../../core/tool_builder.js';
import { groupGetContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const group_get = defineTool(groupGetContract, async (input, ctx) => {
    // TODO: Implement group get
    console.log("Executing group_get", input);
    throw new Error("Not implemented");
});

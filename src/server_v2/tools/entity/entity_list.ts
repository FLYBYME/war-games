import { defineTool } from '../../core/tool_builder.js';
import { entityListContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const entity_list = defineTool(entityListContract, async (input, ctx) => {
    // TODO: Implement entity list
    console.log("Executing entity_list", input);
    throw new Error("Not implemented");
});

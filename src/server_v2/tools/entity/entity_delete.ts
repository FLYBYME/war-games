import { defineTool } from '../../core/tool_builder.js';
import { entityDeleteContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const entity_delete = defineTool(entityDeleteContract, async (input, ctx) => {
    // TODO: Implement entity delete
    console.log("Executing entity_delete", input);
    throw new Error("Not implemented");
});

import { defineTool } from '../../core/tool_builder.js';
import { entityCreateContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const entity_create = defineTool(entityCreateContract, async (input, ctx) => {
    // TODO: Implement entity create
    console.log("Executing entity_create", input);
    throw new Error("Not implemented");
});

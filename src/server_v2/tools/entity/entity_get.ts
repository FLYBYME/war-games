import { defineTool } from '../../core/tool_builder.js';
import { entityGetContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const entity_get = defineTool(entityGetContract, async (input, ctx) => {
    // TODO: Implement entity get
    console.log("Executing entity_get", input);
    throw new Error("Not implemented");
});

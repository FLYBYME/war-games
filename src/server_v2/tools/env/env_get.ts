import { defineTool } from '../../core/tool_builder.js';
import { envGetContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const env_get = defineTool(envGetContract, async (input, ctx) => {
    // TODO: Implement env get
    console.log("Executing env_get", input);
    throw new Error("Not implemented");
});

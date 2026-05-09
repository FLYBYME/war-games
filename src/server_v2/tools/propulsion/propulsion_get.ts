import { defineTool } from '../../core/tool_builder.js';
import { propulsionGetContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const propulsion_get = defineTool(propulsionGetContract, async (input, ctx) => {
    // TODO: Implement propulsion get
    console.log("Executing propulsion_get", input);
    throw new Error("Not implemented");
});

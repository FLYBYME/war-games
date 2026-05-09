import { defineTool } from '../../core/tool_builder.js';
import { combatGetContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const combat_get = defineTool(combatGetContract, async (input, ctx) => {
    // TODO: Implement combat get
    console.log("Executing combat_get", input);
    throw new Error("Not implemented");
});

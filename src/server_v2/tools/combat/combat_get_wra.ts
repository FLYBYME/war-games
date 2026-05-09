import { defineTool } from '../../core/tool_builder.js';
import { combatGetWRAContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const combat_get_wra = defineTool(combatGetWRAContract, async (input, ctx) => {
    // TODO: Implement combat get_wra
    console.log("Executing combat_get_wra", input);
    throw new Error("Not implemented");
});

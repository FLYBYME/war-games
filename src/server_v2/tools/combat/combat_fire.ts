import { defineTool } from '../../core/tool_builder.js';
import { combatFireContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const combat_fire = defineTool(combatFireContract, async (input, ctx) => {
    // TODO: Implement combat fire
    console.log("Executing combat_fire", input);
    throw new Error("Not implemented");
});

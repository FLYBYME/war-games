import { defineTool } from '../../core/tool_builder.js';
import { cmGetInventoryContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const cm_get_inventory = defineTool(cmGetInventoryContract, async (input, ctx) => {
    // TODO: Implement cm get_inventory
    console.log("Executing cm_get_inventory", input);
    throw new Error("Not implemented");
});

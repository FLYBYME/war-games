import { defineTool } from '../../core/tool_builder.js';
import { historyGetLossesContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const history_get_losses = defineTool(historyGetLossesContract, async (input, ctx) => {
    // TODO: Implement history get_losses
    console.log("Executing history_get_losses", input);
    throw new Error("Not implemented");
});

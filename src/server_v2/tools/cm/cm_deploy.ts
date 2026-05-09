import { defineTool } from '../../core/tool_builder.js';
import { cmDeployContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const cm_deploy = defineTool(cmDeployContract, async (input, ctx) => {
    // TODO: Implement cm deploy
    console.log("Executing cm_deploy", input);
    throw new Error("Not implemented");
});

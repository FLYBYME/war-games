import { defineTool } from '../../core/tool_builder.js';
import { signatureGetContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const signature_get = defineTool(signatureGetContract, async (input, ctx) => {
    // TODO: Implement signature get
    console.log("Executing signature_get", input);
    throw new Error("Not implemented");
});

import { defineTool } from '../../core/tool_builder.js';
import { sensorListContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const sensor_list = defineTool(sensorListContract, async (input, ctx) => {
    // TODO: Implement sensor list
    console.log("Executing sensor_list", input);
    throw new Error("Not implemented");
});

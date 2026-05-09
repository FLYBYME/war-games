import { defineTool } from '../../core/tool_builder.js';
import { kinematicsApplyForceContract } from '../../../sdk_v2/contracts/index.js'; // Verify import path

export const kinematics_apply_force = defineTool(kinematicsApplyForceContract, async (input, ctx) => {
    // TODO: Implement kinematics apply_force
    console.log("Executing kinematics_apply_force", input);
    throw new Error("Not implemented");
});

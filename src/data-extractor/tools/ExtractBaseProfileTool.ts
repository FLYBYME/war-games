import { BaseTool } from '../core/Agent.js';
import { KinematicsProfileSchema, AeroProfileSchema, PropulsionProfileSchema, SignatureProfileSchema } from '../../sdk/schemas/index.js';
import { z } from 'zod';

const BaseSchema = z.object({
    platformClass: z.string().optional().describe('The general class, e.g., F-16 Fighting Falcon'),
    variantName: z.string().optional().describe('The specific variant, e.g., F-16C Block 50'),
    type: z.enum(['Aircraft', 'Ship', 'Submarine', 'Facility', 'Weapon']).optional(),
    kinematics: KinematicsProfileSchema.optional(),
    aero: AeroProfileSchema.optional(),
    propulsion: PropulsionProfileSchema.optional(),
    signatures: SignatureProfileSchema.optional(),
});

export class ExtractBaseProfileTool extends BaseTool<typeof BaseSchema> {
    readonly name = 'extract_base_profile';
    readonly description = 'Extracts basic platform information, kinematics, aero, propulsion, and signatures.';
    readonly schema = BaseSchema;

    private result: z.infer<typeof BaseSchema> | null = null;

    execute(args: z.infer<typeof BaseSchema>): string {
        this.result = args;
        return 'Base profile extracted.';
    }

    getResult() { return this.result; }
}

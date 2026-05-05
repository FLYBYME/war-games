import { BaseTool } from '../core/Agent.js';
import { EntityProfileSchema, EntityProfile } from '../../sdk/schemas/index.js';

/**
 * SaveProfileTool: The primary extraction tool.
 * Forces the LLM to output data matching the EntityProfileSchema.
 */
export class SaveProfileTool extends BaseTool<typeof EntityProfileSchema> {
    readonly name = 'save_military_profile';
    readonly description = 'Saves the extracted military technical specifications into the database. You MUST call this tool with the extracted data.';
    readonly schema = EntityProfileSchema;

    private extractedData: EntityProfile | null = null;

    execute(args: EntityProfile): string {
        this.extractedData = args;
        console.log(`[DEBUG] Saved profile: ${args.variantName} (${args.platformClass})`);
        console.log(`[DEBUG] Kinematics: ${JSON.stringify(args.kinematics, null, 2)}`);
        console.log(`[DEBUG] Propulsion: ${JSON.stringify(args.propulsion, null, 2)}`);
        console.log(`[DEBUG] Sensors: ${JSON.stringify(args.sensors, null, 2)}`);
        console.log(`[DEBUG] Signatures: ${JSON.stringify(args.signatures, null, 2)}`);
        return 'Profile successfully saved to memory. You may now terminate the conversation.';
    }

    getExtractedData(): EntityProfile | null {
        return this.extractedData;
    }
}

import { BaseTool } from '../core/Agent.js';
import { SensorProfileSchema } from '../../sdk/schemas/index.js';
import { z } from 'zod';

const SensorsSchema = z.object({
    sensors: z.array(SensorProfileSchema).describe('List of sensors on the platform.')
});

export class ExtractSensorsTool extends BaseTool<typeof SensorsSchema> {
    readonly name = 'extract_sensors';
    readonly description = 'Extracts the sensor suite of the platform.';
    readonly schema = SensorsSchema;

    private result: z.infer<typeof SensorsSchema> | null = null;

    execute(args: z.infer<typeof SensorsSchema>): string {
        this.result = args;
        return 'Sensors extracted.';
    }

    getResult() { return this.result; }
}

import { defineTool } from '../../core/tool_builder.js';
import { dbScenarioGetContract, ScenarioManifestSchema } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { scenarios } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export const db_scenario_get = defineTool(dbScenarioGetContract, async (input, _ctx) => {
    const result = db.select().from(scenarios).where(eq(scenarios.id, input.id)).get();
    
    if (!result) {
        throw new Error(`Scenario not found: ${input.id}`);
    }
    
    return ScenarioManifestSchema.parse(result.manifest);
});

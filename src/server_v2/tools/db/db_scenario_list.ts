import { defineTool } from '../../core/tool_builder.js';
import { dbScenarioListContract, ScenarioManifestSchema } from '../../../sdk_v2/contracts/index.js';
import { db } from '../../db/db.js';
import { scenarios } from '../../db/schema.js';

export const db_scenario_list = defineTool(dbScenarioListContract, async (_input, _ctx) => {
    const results = db.select().from(scenarios).all();
    
    return {
        scenarios: results.map((r) => {
            const manifest = ScenarioManifestSchema.parse(r.manifest);
            return {
                id: r.id,
                name: r.name,
                description: r.description ?? undefined,
                entityCount: manifest.entities.length
            };
        }),
        totalCount: results.length
    };
});

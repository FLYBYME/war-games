import { defineTool } from '../../core/tool_builder.js';
import { historyGetHeatmapContract } from '../../../sdk_v2/contracts/index.js';
import { queryParquet } from '../../db/duckdb.js';

export const history_get_heatmap = defineTool(historyGetHeatmapContract, async (input, ctx) => {
    // DuckDB query to bin positions into a grid for heatmap generation
    const gridSize = input.gridSizeM ?? 100; // Default to 100m
    const sql = `
        SELECT 
            floor(x / ${gridSize}) * ${gridSize} as gridX,
            floor(y / ${gridSize}) * ${gridSize} as gridY,
            count(*) as density
        FROM read_parquet({{FILE}})
        ${input.entityType ? `WHERE entityType = '${input.entityType}'` : ''}
        GROUP BY gridX, gridY
    `;
    
    const results = await queryParquet(input.batchId, 'telemetry', sql);
    
    return {
        cells: results.map((r) => ({
            gridX: Number(r.gridX),
            gridY: Number(r.gridY),
            density: Number(r.density)
        }))
    };
});

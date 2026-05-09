import { defineTool } from '../../core/tool_builder.js';
import { historyListTelemetryContract } from '../../../sdk_v2/contracts/index.js';
import { queryParquet } from '../../db/duckdb.js';

export const history_list_telemetry = defineTool(historyListTelemetryContract, async (input, ctx) => {
    let whereClause = `entityId = '${input.entityId}'`;
    if (input.startTick !== undefined) whereClause += ` AND tick >= ${input.startTick}`;
    if (input.endTick !== undefined) whereClause += ` AND tick <= ${input.endTick}`;

    const sql = `
        SELECT 
            tick, x, y, z, speedKts, heading
        FROM read_parquet({{FILE}})
        WHERE ${whereClause}
        ORDER BY tick ASC
    `;
    
    const snapshots = await queryParquet(input.batchId, 'telemetry', sql);
    
    return {
        snapshots: snapshots.map((r) => ({
            tick: Number(r.tick),
            pos: { x: Number(r.x), y: Number(r.y), z: Number(r.z) },
            speedKts: Number(r.speedKts),
            altM: Number(r.z)
        })),
        totalCount: snapshots.length
    };
});

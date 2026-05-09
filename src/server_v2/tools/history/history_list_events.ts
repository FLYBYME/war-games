import { defineTool } from '../../core/tool_builder.js';
import { historyListEventsContract } from '../../../sdk_v2/contracts/index.js';
import { queryParquet } from '../../db/duckdb.js';

export const history_list_events = defineTool(historyListEventsContract, async (input, ctx) => {
    let whereClause = '1=1';
    
    if (input.eventType) {
        whereClause += ` AND type = '${input.eventType}'`;
    }
    
    if (input.startTick !== undefined) {
        whereClause += ` AND tick >= ${input.startTick}`;
    }
    
    if (input.endTick !== undefined) {
        whereClause += ` AND tick <= ${input.endTick}`;
    }

    const sql = `
        SELECT 
            tick, type, entityId, targetId, data
        FROM read_parquet({{FILE}})
        WHERE ${whereClause}
        ORDER BY tick ASC
    `;
    
    const rows = await queryParquet(input.batchId, 'events', sql);
    
    return {
        events: rows.map((r) => {
            // Safely parse JSON data if present
            let eventData: Record<string, string | number | boolean> | undefined;
            if (r.data && typeof r.data === 'string') {
                try {
                    eventData = JSON.parse(r.data);
                } catch (e) {
                    console.warn('Failed to parse event data JSON:', r.data);
                }
            }

            return {
                tick: Number(r.tick),
                type: String(r.type),
                entityId: r.entityId ? String(r.entityId) : undefined,
                targetId: r.targetId ? String(r.targetId) : undefined,
                data: eventData
            };
        }),
        totalCount: rows.length
    };
});

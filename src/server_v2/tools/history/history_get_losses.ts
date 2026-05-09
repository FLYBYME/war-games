import { defineTool } from '../../core/tool_builder.js';
import { historyGetLossesContract } from '../../../sdk_v2/contracts/index.js';
import { queryParquet } from '../../db/duckdb.js';

export const history_get_losses = defineTool(historyGetLossesContract, async (input, ctx) => {
    // Query events for destructions
    const sql = `
        SELECT entityId, side, tick as destroyedAtTick
        FROM read_parquet({{FILE}})
        WHERE type = 'EntityDestroyed'
    `;

    try {
        const results = await queryParquet(input.batchId, 'events', sql);
        
        let blueLosses = 0;
        let redLosses = 0;
        const breakdown: any[] = [];

        for (const row of results) {
            if (row.side === 'Blue') blueLosses++;
            if (row.side === 'Red') redLosses++;
            breakdown.push({
                entityId: String(row.entityId),
                side: String(row.side),
                destroyedAtTick: Number(row.destroyedAtTick),
                cause: 'Killed in action'
            });
        }

        const lossExchangeRatio = redLosses === 0 ? blueLosses : blueLosses / redLosses;

        return {
            blueLosses,
            redLosses,
            lossExchangeRatio,
            munitionsExpended: 0,
            breakdown
        };
    } catch (e) {
        console.error('Failed to query losses:', e);
        return { 
            blueLosses: 0, 
            redLosses: 0, 
            lossExchangeRatio: 0, 
            munitionsExpended: 0, 
            breakdown: [] 
        };
    }
});

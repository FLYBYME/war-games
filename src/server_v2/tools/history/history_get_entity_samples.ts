import { defineTool } from '../../core/tool_builder.js';
import { historyGetEntitySamplesContract } from '../../../sdk_v2/contracts/index.js';
import { queryParquet } from '../../db/duckdb.js';
import { TelemetrySystem } from '../../../engine/systems/TelemetrySystem.js';
import { KinematicSnapshot } from '../../../engine/components/Telemetry.js';

import { MatchHandle, isMatchHandle } from '../../services/MatchService.js';

export const history_get_entity_samples = defineTool(historyGetEntitySamplesContract, async (input, ctx) => {
    // 1. Try to get from active match first (Fallback for live telemetry)
    try {
        const handle = ctx.app.matchService.getMatch(input.batchId);
        if (isMatchHandle(handle)) {
            const telemetrySystem = handle.world.getSystem(TelemetrySystem);
            if (telemetrySystem) {
                const liveHistory = telemetrySystem.getEntityHistory(input.entityId, handle.world, input.sampleCount);
                if (liveHistory) {
                    return {
                        samples: liveHistory.map((h: KinematicSnapshot) => ({
                            tick: h.tick,
                            position: h.pos,
                            speedKts: h.speedKts,
                            heading: 0, // In-memory snapshot doesn't store heading currently
                            hp: h.hp,
                            isDestroyed: h.isDestroyed,
                            fuelPct: h.fuelPct,
                            mission: h.mission
                        })),
                        totalCount: liveHistory.length
                    };
                }
            }
        }
    } catch (e) {
        // Match not active, proceed to Parquet
    }

    // 2. Query from Parquet
    const sql = `
        SELECT 
            tick, x, y, z, speedKts, heading, hp, isDestroyed, fuelPct, missionType, missionStatus
        FROM read_parquet({{FILE}})
        WHERE entityId = '${input.entityId}'
        ORDER BY tick ASC
    `;
    
    const allRows = await queryParquet(input.batchId, 'telemetry', sql);
    
    if (allRows.length === 0) {
        return { samples: [], totalCount: 0 };
    }

    const count = input.sampleCount;
    const samples = [];
    
    if (allRows.length <= count) {
        // Return everything if we have fewer rows than requested samples
        for (const r of allRows) {
            samples.push(mapRowToSample(r));
        }
    } else {
        // Sample evenly across the range
        for (let i = 0; i < count; i++) {
            const index = Math.floor((i / (count - 1)) * (allRows.length - 1));
            samples.push(mapRowToSample(allRows[index]));
        }
    }

    return {
        samples,
        totalCount: allRows.length
    };
});

function mapRowToSample(r: any) {
    return {
        tick: Number(r.tick),
        position: { x: Number(r.x), y: Number(r.y), z: Number(r.z) },
        speedKts: Number(r.speedKts),
        heading: Number(r.heading),
        hp: Number(r.hp),
        isDestroyed: Boolean(r.isDestroyed),
        fuelPct: Number(r.fuelPct),
        mission: r.missionType ? {
            type: String(r.missionType),
            status: String(r.missionStatus)
        } : undefined
    };
}
